
const { mainModule } = require('process');
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

let YOUTUBE_APIKEY = "AIzaSyAr1JVOE1hPRK2MWWlewCzY4vglSGp9l3M";

const isDoubleByte = (char) => { return (char.charCodeAt(0) > 255); }
const getUnicodeCount = (str) => {
    let count = 0;
    for (let i = 0; i < str.length; ++i) {
        if (isDoubleByte(str[i])) { count++; }
    }
    return count;
}

const getChatId = async (id) => {
    try {
        let url = 'https://www.googleapis.com/youtube/v3/videos';
        let params = {
            part: 'liveStreamingDetails',
            key: YOUTUBE_APIKEY,
            id: id
        }
        const res = await get({ url, qs: params, json: true });
        const data = res.body;

        if (data.error) {
            error = data.error.code + '\t: ' + data.error.errors[0].reason;
            throw error;
        }

        if (data.items.length == 0) {
            error = 'LiveStream not found.';
            throw error;
        }

        let livechatid = data.items[0].liveStreamingDetails.activeLiveChatId;
        console.log(livechatid);
        console.log();
        return livechatid;

    } catch (error) {
        console.log('Oops!');
        console.log(error);
    }
}

const getChatMessages = async (chatid, pageToken) => {
    try {
        let url = 'https://www.googleapis.com/youtube/v3/liveChat/messages';
        let params = {
            part: 'id,snippet,authorDetails',
            key: YOUTUBE_APIKEY,
            liveChatId: chatid,
            pageToken
        }
        const res = await get({ url, qs: params, json: true });
        const data = res.body;

        if (data.error) {
            error = data.error.code + ': ' + data.error.errors[0].reason;
            throw error;
        }

        for (let item of data.items) {
            let useName = item.authorDetails.displayName;
            let chatMsg = item.snippet.displayMessage;
            let auDetails = item.authorDetails;
            let scDetails = item.snippet.superChatDetails;
            let nsDetails = item.snippet.newSponsorDetails;
            // chat message
            if (scDetails) {
                chatMsg = scDetails.userComment;
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
                useName = `${COLOR.bgYellow}${COLOR.fgWhite}${useName}${COLOR.reset}`
            } else if (auDetails.isChatSponsor) {
                useName = `${COLOR.bright}${COLOR.fgGreen}${useName}${COLOR.reset}`
            } else if (auDetails.isChatSponsor) {
                useName = `${COLOR.bright}${COLOR.fgBlue}${useName}${COLOR.reset}`
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
        console.log('Oops!');
        console.log(error);
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