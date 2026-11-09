import { defineStore } from 'pinia';

// Stores
import { useUserStore } from 'stores/user';

/**
 * Private
 */
// Messages have no id, they are told apart by their creation date
const getTime = (message) => Date.parse(message.creation_date);

const getMessagesAfter = (messages, time) => {
    return messages.filter((message) => getTime(message) > time);
};

export const useChannelsStore = defineStore('channels', {
    state: () => ({
        _channels: [], // Channels the user is in
        _messages: {}, // Messages by channel id, undefined until fetched
        _readTimes: {}, // Creation time of the last read message by channel id
    }),

    getters: {
        channels() {
            return this._channels;
        },

        messages(state) {
            return (id) => state._messages[id] ?? [];
        },

        // Messages from other users received since the channel was last read
        unreadCount(state) {
            const userStore = useUserStore();

            return (id) => {
                const messages = getMessagesAfter(state._messages[id] ?? [], state._readTimes[id] ?? 0);

                return messages.filter((message) => message.user !== userStore.user?.user.username).length;
            };
        },
    },

    actions: {
        setChannels(channels) {
            this._channels = channels;
        },

        addChannel(channel) {
            if (this._channels.some((item) => item.id === channel.id)) return;

            this._channels.push(channel);
        },

        // Returns the messages received since the previous fetch, none on the first one
        setMessages(id, messages) {
            const previousMessages = this._messages[id];

            this._messages[id] = messages;

            // Messages sent before opening the app are not new
            if (!previousMessages) {
                this.markAsRead(id);
                return [];
            }

            const lastMessage = previousMessages.at(-1);

            return getMessagesAfter(messages, lastMessage ? getTime(lastMessage) : 0);
        },

        // A sent message shows before the next fetch
        addMessage(id, message) {
            this._messages[id] = [...this.messages(id), message];
        },

        markAsRead(id) {
            const lastMessage = this._messages[id]?.at(-1);

            if (lastMessage) this._readTimes[id] = getTime(lastMessage);
        },
    },
});
