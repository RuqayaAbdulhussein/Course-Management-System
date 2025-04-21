const mongodb = require('mongodb');
require('dotenv').config();
const { ObjectId } = require("mongodb");

let client;  
let db;      

/**
 * connectDB
 * Connects to the MongoDB database if not already connected.
 */
 async function connectDB() {
     if (!client) {
         const uri = process.env.MONGODB_URI;
         client = new mongodb.MongoClient(uri);
         db = client.db('webProject');
         await client.connect();
     }
 }

/**
 * getUser
 * Retrieves a user document by userID.
 * @param {string} userID - ID of the user to retrieve.
 * @returns {Object|null} - User document if found, otherwise null.
 */
async function getUser(userID) {
    await connectDB();
    const users = db.collection('Accounts');
    const user = await users.find({userid: userID}).toArray();
    return user
}

/**
 * createUser
 * Inserts a new user document into the 'users' collection.
 * @param {Object} data - Data of the user to create.
 */
 async function createUser(data) {
    await connectDB();
    const users = db.collection('Accounts');
    await users.insertOne(data);
}

/**
 * updateUser
 * Updates user data based on the username.
 * @param {string} username - Username of the user to update.
 * @param {Object} data - New data to set for the user.
 */
 async function updateUser(username, data) {
    await connectDB();
    const users = db.collection("Accounts");
    await users.updateOne({ userid: username }, { $set: data });
}

/**
 * getUserDetailsFromEmail
 * Retrieves a user document by email.
 * @param {string} email - Email of the user.
 * @returns {Object|null} - User document if found, otherwise null.
 */
 async function getUserDetailsFromEmail(email) {
    await connectDB();
    const users = db.collection("Accounts");
    const result = await users.findOne({ email: email });
    return result;
}
/**
 * 
 * Retrieves a user document by email verification key.
 * @param {string} key - email verification key.
 * @returns {Object|null} - User document if found, otherwise null.
 */
 async function getUserVerifyKey(key) {
    await connectDB();
    const users = db.collection("Accounts");
    const result = await users.findOne({ verifykey: key });
    return result;
}

/**
 * updatePassword
 * Updates a user's password and clears the reset key.
 * @param {string} user ID - ID of the user.
 * @param {string} newPass - New password to set.
 */
 async function updatePassword(userID, newPass) {
    await connectDB();
    const users = db.collection('Accounts');
    await users.updateOne({ userid: userID }, { $set: { password: newPass, resetkey: null } });
}

/**
 * getUserFromPasswordResetKey
 * Retrieves a user document by password reset key.
 * @param {string} key - Password reset key.
 * @returns {Object|null} - User document if found, otherwise null.
 */
 async function getUserFromPasswordResetKey(key) {
    await connectDB();
    const users = db.collection("Accounts");
    const result = await users.findOne({ resetKey: key });
    return result;
}

/**
 * terminateSession
 * Deletes a session from the 'SessionData' collection based on the session key.
 * @param {string} key - Session key to terminate.
 */
async function terminateSession(key) {
    await connectDB()
    let session = db.collection('SessionData')
    await session.deleteOne({key: key})
}

/**
 * updatePassword
 * Updates a user verification status to true, if verified
 * @param {string} userID - ID of the user.
 * @param {string} newPass - New password to set.
 */
 async function updateVerificationStatus(userID) {
    await connectDB();
    const users = db.collection('Accounts');
    await users.updateOne({ userid: userID }, { $set: { verified: true, verifykey: null } });
}

/**
 * createSession
 * Inserts a new session document into the 'SessionData' collection.
 * @param {Object} data - Session data to create.
 */
 async function createSession(data) {
    await connectDB();
    const sessions = db.collection('SessionData');
    await sessions.insertOne(data);
}

/**
 * getSession
 * Retrieves a session document by session key.
 * @param {string} key - Session key.
 * @returns {Object|null} - Session document if found, otherwise null.
 */
 async function getSession(key) {
    await connectDB();
    const sessions = db.collection('SessionData');
    const session = await sessions.findOne({ key });
    return session;
}

/**
 * addRequest
 * Inserts a new request document into the 'requests' collection.
 * @param {Object} data - Request data to insert.
 * @returns {boolean} - Returns true if insertion is successful.
 */
async function addRequest(data){
    await connectDB()
    let requests = db.collection('requests')
    requests.insertOne(data)
    return true
}

/**
 * getRequests
 * Retrieves all request documents for a specific user.
 * @param {string} userid - ID of the user.
 * @returns {Array} - Array of request documents.
 */
async function getRequests(userid) {
    await connectDB();
    const requests = db.collection('requests');
    const requestsFound = await requests.find({ userid: userid }).toArray();
    return requestsFound;
  }

/**
 * getAllRequests
 * Retrieves all request documents in the 'requests' collection.
 * @returns {Array} - Array of all request documents.
 */
  async function getAllRequests(){
    await connectDB();
    const requests = db.collection('requests');
    const allRequestsFound = await requests.find({}).toArray();
    return allRequestsFound;
}

/**
 * getCategoryRequests
 * Retrieves all request documents by category.
 * @param {string} category - Category of the requests to retrieve.
 * @returns {Array} - Array of request documents.
 */
async function getCategoryRequests(category){
    await connectDB();
    const requests = db.collection('requests');
    const requestsFound = await requests.find({ category: category }).toArray();
    return requestsFound;
}

/**
 * cancelRequest
 * Updates the status of a request to 'Cancelled' based on request ID.
 * @param {string} requestId - The ID of the request to cancel.
 * @returns {Object} - Result of the update operation.
 */
async function cancelRequest(requestId) {
    await connectDB();
    const requests = db.collection('requests');
    const result = await requests.updateOne({ _id: new ObjectId(requestId) }, { $set: { status: "Cancelled" } });
    return result;
}

/**
 * resolveRequest
 * Updates the status of a request to 'Resolved' based on request ID.
 * @param {string} requestId - The ID of the request to resolve.
 * @returns {Object} - Result of the update operation.
 */
async function ResolveRequest(requestId) {
    await connectDB();
    const requests = db.collection('requests');
    const result = await requests.updateOne({ _id: new ObjectId(requestId) }, { $set: { status: "Resolved" } });
    return result;
}

/**
 * rejectRequest
 * Updates the status of a request to 'Rejected' based on request ID.
 * @param {string} requestId - The ID of the request to reject.
 * @returns {Object} - Result of the update operation.
 */
async function RejectRequest(requestId) {
    await connectDB();
    const requests = db.collection('requests');
    const result = await requests.updateOne({ _id: new ObjectId(requestId) }, { $set: { status: "Rejected" } });
    return result;
}

/**
 * addNote
 * Adds a note to a specific request.
 * @param {string} id - ID of the request.
 * @param {string} note - Note to add to the request.
 * @returns {Object} - Result of the update operation.
 */
async function addNote(id, note){
    await connectDB()
    let requests = db.collection('requests')
    const result = await requests.updateOne(
        { _id: new ObjectId(id) },
        { $set: { note: note } }
      );
    return result
}

module.exports= {
    createUser,
    updateUser,
    getUserDetailsFromEmail,
    getUserVerifyKey,
    updateVerificationStatus,
    getUser,
    createSession,
    getSession,
    getUserFromPasswordResetKey,
    updatePassword,
    addRequest,
    getRequests,
    cancelRequest,
    getAllRequests,
    getCategoryRequests,
    ResolveRequest,
    RejectRequest,
    addNote,
    terminateSession
}