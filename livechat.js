

if (require('fs').existsSync('./debug.js')) { require('./debug.js'); }
const request = require('request');
const util = require('util');
const get = util.promisify(request.get);

const COLOR = {
    reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
    underscore: '\x1b[4m', blink: '\x1b[5m', reverse: '\x1b[7m', hidden: '\x1b[8m',

    fgBlack: '\x1b[30m', fgRed: '\x1b[31m', fgGreen: '\x1b[32m', fgYellow: '\x1b[33m',
    fgBlue: '\x1b[34m', fgMagenta: '\x1b[35m', fgCyan: '\x1b[36m', fgWhite: '\x1b[37m',

    bgBlack: '\x1b[40m', bgRed: '\x1b[41m', bgGreen: '\x1b[42m', bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m', bgMagenta: '\x1b[45m', bgCyan: '\x1b[46m', bgWhite: '\x1b[47m',
};

let YOUTUBE_SUBAPIKEY = [
    process.env.YOUTUBE_APIKEY_1,
    process.env.YOUTUBE_APIKEY_2,
    process.env.YOUTUBE_APIKEY_3,
    process.env.YOUTUBE_APIKEY_4,
    process.env.YOUTUBE_APIKEY_5,
    process.env.YOUTUBE_APIKEY_6,
];
const shiftAPIKey = () => {
    if (YOUTUBE_SUBAPIKEY.length < 0) { return; }
    YOUTUBE_SUBAPIKEY.shift();
};

const getUnicodeCount = (str) => {
    let count = 0;
    for (let i = 0; i < str.length; ++i) {
        if ((str[i]).charCodeAt(0) > 255) { count++; }
    }
    return count;
}

const getChatId = async (id) => {
    try {
        let url = 'https://www.googleapis.com/youtube/v3/videos';
        let params = {
            part: 'snippet,liveStreamingDetails',
            key: YOUTUBE_SUBAPIKEY[0],
            id: id
        }
        const res = await get({ url, qs: params, json: true });
        const data = res.body;

        if (data.error) { throw data.error; }
        if (data.items.length == 0) { throw 'LiveStream not found.'; }

        let livechatid = data.items[0].liveStreamingDetails.activeLiveChatId;
        console.log(data.items[0].snippet.title);
        console.log(livechatid);
        console.log();
        return livechatid;

    } catch (error) {
        // quotaExceeded
        if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'quotaExceeded') {
            console.log(`ERR! quotaExceeded key: ${YOUTUBE_SUBAPIKEY[0]}`);
            shiftAPIKey();
            // retry
            if (YOUTUBE_SUBAPIKEY.length > 0) { return await getChatId(id); }
        }

        console.log('Oops!');
        console.log(error);
        // console.log(error =  + '\t: ' + error.errors[0].reason);
    }
}

const getChatMessages = async (chatid, pageToken) => {
    try {
        let url = 'https://www.googleapis.com/youtube/v3/liveChat/messages';
        let params = {
            part: 'id,snippet,authorDetails',
            key: YOUTUBE_SUBAPIKEY[0],
            liveChatId: chatid,
            pageToken
        }
        const res = await get({ url, qs: params, json: true });
        const data = res.body;

        if (data.error) { throw data.error; }

        for (let item of data.items) {
            let useName = item.authorDetails.displayName;
            let chatMsg = item.snippet.displayMessage;
            let auDetails = item.authorDetails;
            let scDetails = item.snippet.superChatDetails;
            let nsDetails = item.snippet.newSponsorDetails;
            // chat message
            if (scDetails) {
                chatMsg = scDetails.userComment || chatMsg;
                switch (scDetails.tier) {
                    case 1: { chatMsg = `${COLOR.bgBlue}${COLOR.fgWhite}${chatMsg}${COLOR.reset}`; } break;
                    case 2: { chatMsg = `${COLOR.bgCyan}${COLOR.fgWhite}${chatMsg}${COLOR.reset}`; } break;
                    case 3: { chatMsg = `${COLOR.bgGreen}${COLOR.fgWhite}${chatMsg}${COLOR.reset}`; } break;
                    case 4: { chatMsg = `${COLOR.bgYellow}${COLOR.fgWhite}${chatMsg}${COLOR.reset}`; } break;
                    case 5: { chatMsg = `${COLOR.bgYellow}${COLOR.fgRed}${chatMsg}${COLOR.reset}`; } break;
                    case 6: { chatMsg = `${COLOR.bgMagenta}${COLOR.fgWhite}${chatMsg}${COLOR.reset}`; } break;
                    case 7: { chatMsg = `${COLOR.bgRed}${COLOR.fgWhite}${chatMsg}${COLOR.reset}`; } break;
                }
            }
            if (nsDetails) {
                chatMsg = `${COLOR.bright}${COLOR.fgGreen}${chatMsg}${COLOR.reset}`;
            }
            // user name
            let unicodeCount = getUnicodeCount(useName);
            useName = useName.padStart(32 - unicodeCount, ' ')
            if (auDetails.isChatOwner) {
                useName = `${COLOR.bgYellow}${COLOR.fgBlack}${useName}${COLOR.reset}`
            } else if (auDetails.isChatSponsor) {
                useName = `${COLOR.bright}${COLOR.fgGreen}${useName}${COLOR.reset}`
            } else if (auDetails.isChatModerator) {
                useName = `${COLOR.bright}${COLOR.fgCyan}${useName}${COLOR.reset}`
            }
            // show chat
            console.log(` ${useName} ${COLOR.bgWhite}${COLOR.fgBlack}:${COLOR.reset} ${chatMsg}`)
        }

        // next request
        pageToken = data.nextPageToken;
        let nextTime = data.pollingIntervalMillis;
        // console.log(` -- ${data.items.length.toString().padStart(3, ' ')} messages returned -- ${nextTime} ${pageToken}`)
        setTimeout(() => { getChatMessages(chatid, pageToken); }, nextTime);

    } catch (error) {
        // quotaExceeded
        if (Array.isArray(error.errors) && error.errors[0] && error.errors[0].reason == 'quotaExceeded') {
            console.log(`ERR! quotaExceeded key: ${YOUTUBE_SUBAPIKEY[0]}`);
            shiftAPIKey();
            // retry
            if (YOUTUBE_SUBAPIKEY.length > 0) { return await getChatMessages(chatid, pageToken); }
        }

        console.log('Oops!');
        console.log(error);
        // console.log(error =  + '\t: ' + error.errors[0].reason);
    }
}

const main = (arguments) => {
    switch (arguments[2]) {
        case '--id':
            getChatId(arguments[3]).then(getChatMessages);
            break;
        case '--messages':
            getChatMessages(arguments[3]);
            break;
        case '--help':
            console.log(`
Arguments:              Function:

--id [livestreamid]     Prints the LiveChatID for the given Live Stream.
                        The LiveStreamID is found in the URL of the LiveStream:
                        http://www.youtube.com/watch?v=[thisisthelivestreamid].

--messages [livechatid] Prints the chat messages for the given LiveChat.
        `);
            break;
        default:
            console.log(
                'No Valid Argument(s) Passed. Use --help to see valid arguments.'
            );
    }
}; main(process.argv);

// Oops!
// {
//   code: 403,
//   message: 'The request is missing a valid API key.',
//   errors: [
//     {
//       message: 'The request is missing a valid API key.',
//       domain: 'global',
//       reason: 'forbidden'
//     }
//   ],
//   status: 'PERMISSION_DENIED'
// }

// Oops!
// {
//   code: 403,
//   message: 'The request cannot be completed because you have exceeded your <a href="/youtube/v3/getting-started#quota">quota</a>.',
//   errors: [
//     {
//       message: 'The request cannot be completed because you have exceeded your <a href="/youtube/v3/getting-started#quota">quota</a>.',
//       domain: 'youtube.quota',
//       reason: 'quotaExceeded'
//     }
//   ]
// }

// Oops!
// {
//   code: 403,
//   message: 'The live chat is no longer live.',
//   errors: [
//     {
//       message: 'The live chat is no longer live.',
//       domain: 'youtube.liveChat',
//       reason: 'liveChatEnded'
//     }
//   ]
// }