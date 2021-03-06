import * as config from 'config';
import * as countdown from 'countdown';
import * as moment from 'moment';

import { Parser } from '..';
import { IMessage } from '../interface';
import { httpRequest } from '../lib/helpers';
import { IGlimeshRes } from './glimesh';

export const methods = {
    glimesh: async (_parser: Parser, request: typeof fetch, channelName: string, userName: string): Promise<string> => {
        const reqHeaders = {
            Authorization: `Client-ID ${config.get('providers.glimesh.clientId')}`,
        };
        const reqBody = `
            query {
                followers(streamerUsername: "${channelName}", userUsername: "${userName}") {
                    id
                    insertedAt
                }
            }
        `;

        const req: IGlimeshRes = await httpRequest(request, config.get('providers.glimesh.api'), { headers: reqHeaders, method: 'POST', body: reqBody });
        if (req == null) {
            return '[API Error]';
        }
        if (req?.data?.followers === null) {
            return '[User Not Following]';
        }

        return countdown(new Date(), moment(req.data.followers[0].insertedAt).toDate()).toString();
    },
    twitch: async (parser: Parser, _request: never, channelId: string, userId: string, coreId: string, serviceId: string): Promise<string> => {
        const res = await parser.opts.reqCallback(
            `${config.get<string>('providers.twitch.api')}helix/users/follows?from_id=${userId}&to_id=${channelId}`, {
                coreId,
                method: 'GET',
                serviceId,
            });
        if (res == null) {
            return '[API Error]';
        }

        if (res.total === 0 || res.data.length === 0) {
            return '[User Not Following]';
        }

        return countdown(new Date(), moment(res.data[0].followed_at).toDate()).toString();
    },
};

export async function followage(this: Parser, message: IMessage, _settings: never, request: typeof fetch) {
    if (methods[message.provider.toLowerCase()] == null) {
        return '[Not Supported]';
    }

    if (message.provider === 'glimesh') {
        return methods[message.provider.toLowerCase()](this, request, message.channel.name, message.user.name, message.channel.coreId, message.channel.serviceId);
    }

    return methods[message.provider.toLowerCase()](this, request, message.channel.id, message.user.id, message.channel.coreId, message.channel.serviceId);
}
