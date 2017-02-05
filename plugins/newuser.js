const https = require('https');

const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const winston = require('winston');

const META = {
    name: 'newuser',
    short: 'Greets new users and sends them a copy of the code of conduct',
    examples: [
        '@bosta greet @Username',
    ],
};

const cocURL = 'https://raw.githubusercontent.com/mena-devs/code-of-conduct/master/GREETING.md';

/**
 * Retrieve the CoC from the github URL
 *
 * @return {[type]} [description]
 */
function retrieveCoC() {
    return new Promise((resolve, reject) => {
        https.get(cocURL, (res) => {
            // Combine the chunks that are retrieved
            const responseParts = [];
            res.setEncoding('utf8');
            res.on('data', (d) => {
                responseParts.push(d);
            });
            // Combine the chunks and resolve
            res.on('end', () => {
                resolve(responseParts.join(''));
            });
        }).on('error', (e) => {
            reject(e);
        });
    });
}

/**
 * Retrieves user information from ID
 * TODO: Move it to utils.js
 *
 * @param {[type]} bot [description]
 * @param {[type]} id  [description]
 *
 * @return {String} Username associated the ID provided
 */
function findUser(web, id) {
    return new Promise((resolve, reject) => {
        // Send a private message to the user with the CoC
        web.users.info(id, (err, res) => {
            if (err) {
                reject(`I don't know of a ${id}`);
            } else {
                resolve(res.user.name);
            }
        });
    });
}

/**
 * Send a private message to a user
 *
 * @param {[type]} web      [description]
 * @param {[type]} receiver [description]
 * @param {[type]} message  [description]
 *
 * @return {[type]} [description]
 */
function postMessage(web, receiver, message) {
    return new Promise((resolve, reject) => {
        // Send a private message to the user with the CoC
        const msg = `Hi ${receiver.name}! \n\
I'm *Bostantine Androidaou* MENA Dev's butler. I'm at your service, all you \
gotta do is to call \`@bosta help\`. In the meantime, here's a message \
from the admins: \n\n ${message}`;

        web.chat.postMessage(receiver.id, msg, { as_user: true }, (err) => {
            if (err) {
                reject(`Welcome message could not be sent: ${err}`);
            } else {
                resolve(true);
            }
        });
    });
}

/**
 * Main
 *
 * @param {[type]} bot    [description]
 * @param {[type]} rtm    [description]
 * @param {[type]} web    [description]
 * @param {[type]} config [description]
 *
 * @return {[type]} [description]
 */
function register(bot, rtm, web) {
    rtm.on(RTM_EVENTS.MESSAGE, (message) => {
        if (message.text) {
            const pattern = /<@([^>]+)>:? greet <@([^>]+)>:?/;
            const [, target, userId] = message.text.match(pattern) || [];
            const user = { id: userId, name: '' };

            if (target === bot.self.id) {
                findUser(web, user.id)
                    .then((response) => {
                        user.name = response;
                        rtm.sendMessage(`Welcome on-board ${user.name} glad to have you here`, message.channel);
                    })
                    .then(() => retrieveCoC())
                    .then(data => postMessage(web, user, data))
                    .catch(error => winston.error(error));
            }
        }
    });
}


module.exports = {
    register,
    META,
};