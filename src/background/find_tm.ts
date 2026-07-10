
import { IS_FIREFOX } from '../env';
import { short_id } from './browser';
import { logger as console } from '../shared/logger';
import { getRandomString } from '../shared/utils';
import { OptionsExternalRequest, OptionsExternalResponse } from '../types/external';
import Config from './config';

export const ExtensionIdsToTry = IS_FIREFOX
    ? [
        'firefox@tampermonkey.net',
        'firefoxbeta@tampermonkey.net'
    ] as const
    : [
        'dhdgffkkebhmkfjojejmpbldmpobfkfo',
        'gcalenpjmijncebpfijmoaglllgpjagf',
        'lcmhijbkigalmkeommnijlpobloojgfn',
        'iikmkjmpaadaobahmlepeloendndfphd',
        'fcmfnpggmnlmfebfghbfnillijihnkoh',
        'mfdhdgbonjidekjkjmjaneanmdmpmidf',
        'heiflgcdlcilkmbminjohdnmejohiblb'
    ] as const;

export type ExtensionIdToTry = typeof ExtensionIdsToTry[number];

const OFFICIAL_EXTENSION_SHORT_IDS: string[] = [
    'lieo'
];
const EXTENSION_PROBE_TIMEOUT = 2000;

const { runtime } = chrome;
const active_connections: Partial<Record<ExtensionIdToTry, false | chrome.runtime.Port>> = {};

export const findTm = async (activeUrls: string[]): Promise<{ id: string, port: chrome.runtime.Port }[]> => {
    const configuredIds = Config.values.externalExtensionIds || [];
    const to_try = [ ...new Set([
        ...ExtensionIdsToTry,
        ...(!OFFICIAL_EXTENSION_SHORT_IDS.length || OFFICIAL_EXTENSION_SHORT_IDS.includes(short_id) ? [] : configuredIds)
    ]) ];

    await Promise.all(to_try.map(id => {
        if (active_connections[id] !== undefined) return;
        active_connections[id] = false;

        return new Promise<void>(resolve => {
            try {
                const port = runtime.connect(id);
                const messageId = getRandomString();
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);
                    port.onMessage.removeListener(onMessage);
                    port.onDisconnect.removeListener(onDisconnect);
                    resolve();
                };
                const onMessage = (m: OptionsExternalResponse | undefined) => {
                    void(runtime.lastError);
                    if (!m) {
                        delete active_connections[id];
                        finish();
                        port.disconnect();
                        return;
                    }
                    if (m.messageId !== messageId) return;
                    if (m.allow && m.allow.includes('list')) {
                        active_connections[id] = port;
                    }
                    finish();
                };
                const onDisconnect = () => {
                    void(runtime.lastError);
                    delete active_connections[id];
                    finish();
                };
                const timeout = setTimeout(() => {
                    delete active_connections[id];
                    finish();
                    try {
                        port.disconnect();
                    } catch {}
                }, EXTENSION_PROBE_TIMEOUT);

                port.onMessage.addListener(onMessage);
                port.onDisconnect.addListener(onDisconnect);
                port.postMessage(<OptionsExternalRequest>{ method: 'userscripts', action: 'options', messageId, activeUrls });
            } catch (e) {
                delete active_connections[id];
                console.debug(`unable to talk to ${id}`, e);
                resolve();
            }
        });
    }));

    return (Object.keys(active_connections) as ExtensionIdToTry[]).filter(k => active_connections[k] !== false).map(id => ({ id, port: active_connections[id] as chrome.runtime.Port }));
};
