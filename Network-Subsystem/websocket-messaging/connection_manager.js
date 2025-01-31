// File: message_handler.js
// Author: Julian Fisher
// Date: 12/9/2022
// Description: This file exports the ConnectionManager class. This class defines how
// to handle message as they are passed through the network. As well as creating a websocket
// server to listen for incoming connections, and a client manger to make outbound websocket
// connection.
//
// METHODS:
//  handle(jsonMessage) - Process the given message
//  sendReceipt(jsonMessage) - Interprets the message as a SendReceipt message and distributes
//      sends the receipt to the appropriate peer(s)
//  requestReceipt(jsonMessage) - Interprets the message as a RequestReceipt message and
//      asks all peers for receipts that match the criteria
//  checkMessage(jsonMessage) - Verify that the message is properly formatted

const checkMessage = require('./message_checker');
const Cache = require('./data_cache');
const ClientManager = require('./client_manager');
const WsServer = require('./socket_server');
const rcpt_model = require('../models/receipts');

class ConnectionManager {
    /** 
    * @param {number} messageRetentionTime - The maximum number of messages to be stored in the cache
    * @param {number} maxNumMessagesRetained - The maximum amount of time to hold messages in the cache, in milliseconds
    * @param {number} maxReceiptRetentionTime - The maximum number of reputation receipts to be stored in the cache
    * @param {number} maxNumReceiptsRetained - The maximum amount of time to hold reputation receipts in the cache, in milliseconds
    * @param {number} savePercent - The percentage of receipts to save as messages come through
    */
    constructor(messageRetentionTime, maxNumMessagesRetained, maxReceiptRetentionTime, maxNumReceiptsRetained, port, savePercent, databaseManager) {
        this.messageCache = new Cache(messageRetentionTime, maxNumMessagesRetained);
        this.receiptCache = new Cache(maxReceiptRetentionTime, maxNumReceiptsRetained);
        this.sockServ = WsServer(port, this);
        this.clientManager = new ClientManager(this);
        this.prctSave = savePercent;
        this.dbMan = databaseManager;
    }

    handleMessage(jsonMessage) {
        console.log("Received " + jsonMessage);

        if (!checkMessage(jsonMessage)){
            throw new Error("Invalid message recieved");
        }

        let msgID = jsonMessage['Header']['MsgID'];

        if(this.messageCache.isCached(msgID)){
            throw new Error("Message already recieved");
        }

        this.messageCache.cache(msgID);

        if (jsonMessage.Header.MsgType === 'ShareReceipt') {
            shareReceipt(jsonMessage);
        }
        else if (jsonMessage.Header.MsgType === 'ReceiveReceipt') {
            receiveReceipt(jsonMessage);
        }
    }

    #shareReceipt(jsonMessage) {
        messageSrc = jsonMessage["Header"]["SrcIPorHost"]
        // TODO:
        // Verify rcpt hash w/ blockchain
        
        if (Math.random() <= this.prctSave) {
            this.dbMan.saveReceipt(jsonMessage["Body"]["Recetipt"]);
        }
        this.receiptCache.cache(jsonMessage["Body"]["Recetipt"]);
        this.sendAllExcept(jsonMessage,messageSrc);

        console.log('shareReceipt');
    }

    #requestReceipt(jsonMessage) {
        // Search local cache for matching rcpts
        // Search local db for matches
        // Send response if rcpts are found
        // Forward req to other neighbors
        console.log('ReceiveReceipt');
    }

    // share receipt with all peers except for the excepted URL
    sendAllExcept(msg, except){
        // repeat message to other neighbors
        websocketServer.clients.forEach(client => {
            if (clientConn._socket.server._connectionKey != except){
                client.send(msg);
            }
        });

        this.clientManager.sendExcept(except);
    }

    refreshCache(){
        this.messageCache.cleanCache();
    }
}

module.exports = ConnectionManager;