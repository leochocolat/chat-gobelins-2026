import { defineStore } from 'pinia';

// Stores
import { useUserStore } from 'stores/user';

/**
 * Private
 */
// Time the message shows in the channel, later than its creation for a scheduled message
const getTime = (message) => Date.parse(message.posted_at);

const getMessagesAfter = (messages, time) => {
    return messages.filter((message) => getTime(message) > time);
};

// The server sends the newest first, channels show the oldest first
const sortMessages = (messages) => {
    return [...messages].sort((a, b) => getTime(a) - getTime(b) || a.id - b.id);
};

export const useChannelsStore = defineStore('channels', {
    state: () => ({
        _channels: [], // Channels the user is in
        _messages: {}, // Messages by channel id, undefined until fetched
        _readTimes: {}, // Posting time of the last read message by channel id
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
            const sortedMessages = sortMessages(messages);

            this._messages[id] = sortedMessages;

            // Messages sent before opening the app are not new
            if (!previousMessages) {
                this.markAsRead(id);
                return [];
            }

            const previousIds = new Set(previousMessages.map((message) => message.id));

            return sortedMessages.filter((message) => !previousIds.has(message.id));
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
