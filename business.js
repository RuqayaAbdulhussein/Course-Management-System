const math = require('math')
const db = require('./persistence');
const crypto = require('crypto');


const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0'); 
const day = now.getDate().toString().padStart(2, '0');
let hours = now.getHours();
const minutes = now.getMinutes().toString().padStart(2, '0');
const ampm = hours >= 12 ? 'PM' : 'AM';
hours = hours % 12 || 12;
const date = `${year}-${month}-${day}`;
const time = `${hours}:${minutes} ${ampm}`;
const dateTimeFormatted = `${date}, ${time}`;

/**
 * getUser
 * Retrieves a user document by userID from the persistence layer.
 * @param {string} userID - ID of the user to retrieve.
 * @returns {Object|null} - User document if found, otherwise null.
 */
async function getUser(userID){
    let user = await db.getUser(userID)
    return user
}

/**
 * validateUser
 * Validates the user based on requirments
 * @param {string} userid - ID for the student.
 * @param {string} name - Name for the student.
 * @param {string} password - Plaintext password for the student which is then hashed.
 * @param {string} email - Email for the student.
 * @param {string} phone - phone number of student
 *  @param {string} major - students major of study
 * @returns {String|Boolean} - Error message if incorrect input, otherwise returns true.
 */
 async function validateUser(userid, name, password, email, phone, major) {
    if (!/^[0-9]{8}$/.test(userid)) {
        return "UserID must be exactly 8 digits";
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
        return "Name must contain only upper or lower case letters";
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/.test(password)) {
        return "Password must be at least 8 characters with letters, digits, and a special character";
    }
    if (email !== `${userid}@udst.edu.qa`) {
        return "Email must be in the format 8-digit UserID followed by @udst.edu.qa";
    }
    if (!/^[0-9]{8}$/.test(phone)) {
        return "Phone number must be exactly 8 digits";
    }
    if (!/^[a-zA-Z]+$/.test(major)) {
        return "Major must contain only upper or lower case letters";
    }
    return true;
}


/**
 * createUser
 * Creates a new user if the userID doesn't already exist.
 * @param {string} userid - ID for the student.
 * @param {string} name - Name for the student.
 * @param {string} password - Plaintext password for the student which is then hashed.
 * @param {string} email - Email for the student.
 * @param {string} phone - phone number of student
 *  @param {string} major - students major of study
 * @returns {Object|null} - Error message if username exists, otherwise null.
 */
 async function createUser(userid, name, password, email, phone, major) {
    await db.createUser({
        userid : userid, 
        name : name, 
        password : hash(password), 
        email : email, 
        phone : phone,
        major: major,
        accountType: "Student",
        verified: false
    });
}

/**
 * hash
 * Hashes a plaintext string using SHA-256.
 * @param {string} input, any string
 * @returns {string} - Hashed string output.
 */
 function hash(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * loginAttempt
 * Attempts to log in a user by validating username and hashed password.
 * @param {string} userID - ID for login.
 * @param {string} password - Plaintext password for login.
 * @returns {Object|undefined} - Session data if login succeeds, otherwise undefined.
 */
 async function loginAttempt(userID, password) {
    const data = await db.getUser(userID);
    let user = data[0]
    if (!user || hash(password) !== user.password) {
        
        return undefined;
    }

    const sessionKey = crypto.randomUUID();
    const sessionData = {
        key: sessionKey,
        expiry: new Date(Date.now() + 1000 * 60 * 20),
        data: { userID: user.userid },
        csrfToken: generateFormToken(),
    };
    await db.createSession(sessionData);
    let session = await db.getSession(sessionKey)
    return session
}

/**
 * generateFormToken
 * Generates a CSRF token using cryptographic random bytes.
 * @returns {string} - A securely generated random token in hexadecimal format.
 */
function generateFormToken() {
    let token = crypto.randomBytes(32).toString("hex");  
    return token
}

/**
 * cancelToken
 * Removes the CSRF token from the session.
 * @param {string} sessionID - The ID of the session to modify.
 */
async function cancelToken(sessionID) {
    let sd = await getSession(sessionID)
    delete sd.csrfToken
    await persistence.updateSession(sd)
}

/**
 * fetchSession
 * Retrieves session data by session key.
 * @param {string} key - Session key.
 * @returns {Object|null} - Session data if found, otherwise null.
 */
 async function fetchSession(key) {
    return await db.getSession(key);
}

/**
 * terminateSession
 * Terminates the session associated with the given key.
 * @param {string} key - Session key.
 */
async function terminateSession(key) {
    if (!key) {
        return
    }
    await db.terminateSession(key)
}

/**
 * getUserDetailsFromEmail
 * Retrieves user details by email.
 * @param {string} email - Email of the user.
 * @returns {Object|null} - User data if found, otherwise null.
 */
 async function getUserDetailsFromEmail(email) {
    return await db.getUserDetailsFromEmail(email);
}


/**
 * getUserVerifyKey
 * Retrieves user data by email verification key.
 * @param {string} key - Email verification key.
 * @returns {Object|null} - User data if found, otherwise null.
 */
 async function getUserVerifyKey(key) {
    const verifyKey = hash("reset: " + key);
    return await db.getUserVerifyKey(verifyKey);
}

/**
 * sendVerificationEmail
 * Sends a email verification link with a unique key.
 * @param {Object} user - User object containing username and email.
 */
 async function sendVerificationEmail(user) {
    const key = crypto.randomUUID();
    const verifyResetKey = hash("reset: " + key);
    
    await db.updateUser(user.userid, { verifykey: verifyResetKey });
    
    console.log(`email verification link: http://localhost:8000/verify?key=${key}`);
}

/**
 * updateVerificationStatus
 * Updates a user verification status and clears the reset key.
 * @param {string} userID - ID of the user.
 * @param {string} newPass - New password to set.
 */
 async function updateVerificationStatus(userID) {
    await db.updateVerificationStatus(userID);
}

/**
 * getUserFromPasswordResetKey
 * Retrieves user data by password reset key.
 * @param {string} key - Password reset key.
 * @returns {Object|null} - User data if found, otherwise null.
 */
 async function getUserFromPasswordResetKey(key) {
    const passwordResetKey = hash("reset: " + key);
    return await db.getUserFromPasswordResetKey(passwordResetKey);
}

/**
 * passwordResetEmail
 * Sends a password reset email with a unique key (mocked by console.log).
 * @param {Object} user - User object containing username and email.
 */
 async function passwordResetEmail(user) {
    const key = crypto.randomUUID();
    const verifyResetKey = hash("reset: " + key);
    await db.updateUser(user.userid, { resetKey: verifyResetKey });
    
    console.log(`Password reset email link: http://localhost:8000/reset-password?key=${key}`);
}

/**
 * setNewPassword
 * Sets a new password for a user based on a valid reset key.
 * @param {string} key - Password reset key.
 * @param {string} password - New plaintext password.
 */
 async function setNewPassword(key, password) {
    const user = await getUserFromPasswordResetKey(key);
    await changePassword(user.userid, password);
}

/**
 * changePassword
 * Changes a user's password to a new hashed password.
 * @param {string} userID - ID of the user.
 * @param {string} newPassword - New plaintext password.
 */
 async function changePassword(userID, newPassword) {
    const hashedPassword = hash(newPassword);
    await db.updatePassword(userID, hashedPassword);
}

/**
 * calculateEstimatedCompletion
 * Estimates the expected completion datetime for a request based on queue length and working hours.
 * @param {string} category - Request category to calculate timing for.
 * @param {Date} [submissionTime=new Date()] - Optional submission time, defaults to current time.
 * @returns {Promise<string>} - A formatted string representing the estimated completion datetime.
 */
async function calculateEstimatedCompletion(category, submissionTime = new Date()) {
    const WORK_DAY_START = 8;
    const WORK_DAY_END = 15;
    const WORKING_DAYS = [0, 1, 2, 3, 4];
    const MINUTES_PER_REQUEST = 20;

    const allRequests = await db.getAllRequests();

    let pendingRequests = [];
    for (let i = 0; i < allRequests.length; i++) {
        if (allRequests[i].status === "Pending") {
            pendingRequests.push(allRequests[i]);
        }
    }

    categoryPending = []

    for (let i = 0; i < pendingRequests.length; i++)
    if (pendingRequests[i].category === category) {
        categoryPending.push(pendingRequests[i]);
        } 

    if (categoryPending.length === 0) {
        startFrom = new Date(submissionTime);
    } else {
        startFrom = new Date(categoryPending[categoryPending.length - 1].estimatedCompletion);
    }

    const isWorkingDay = (date) => WORKING_DAYS.includes(date.getDay());

    const moveToNextWorkDay = (date) => {
        do {
            date.setDate(date.getDate() + 1);
        } while (!isWorkingDay(date));
        date.setHours(WORK_DAY_START, 0, 0, 0);
    };

    let estimatedDate = new Date(startFrom);

    if (!isWorkingDay(estimatedDate) || estimatedDate.getHours() >= WORK_DAY_END || estimatedDate.getHours() < WORK_DAY_START) {
        moveToNextWorkDay(estimatedDate);
    }

    let totalMinutes = MINUTES_PER_REQUEST;

    while (totalMinutes > 0) {
        if (!isWorkingDay(estimatedDate) ||
            estimatedDate.getHours() >= WORK_DAY_END ||
            estimatedDate.getHours() < WORK_DAY_START) {
            moveToNextWorkDay(estimatedDate);
            continue;
        }

        let minutesLeftToday = ((WORK_DAY_END - estimatedDate.getHours()) * 60) - estimatedDate.getMinutes();

        if (totalMinutes <= minutesLeftToday) {
            estimatedDate.setMinutes(estimatedDate.getMinutes() + totalMinutes);
            totalMinutes = 0;
        } else {
            totalMinutes -= minutesLeftToday;
            moveToNextWorkDay(estimatedDate);
        }
    }

    const datePart = estimatedDate.toISOString().split("T")[0];
    let hours = estimatedDate.getHours();
    const minutes = estimatedDate.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${datePart}, ${hours}:${minutes} ${ampm}`;
}


/**
 * sendEmail
 * Simulates sending an email by logging the message to the console.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject.
 * @param {string} message - Email message content.
 */
function sendEmail(to, subject, message) {
    console.log(`[EMAIL TO: ${to}] Subject: ${subject} | Message: ${message}`);
  }

/**
 * addRequest
 * Adds a new user request with estimated completion time and sets its initial status to Pending.
 * @param {Object} data - Data for the request (userid, username, email, etc.).
 * @returns {Object} - The result of the addRequest operation from the database.
 */
async function addRequest(data) {
    const estimatedCompletion = await calculateEstimatedCompletion(data.category);

    let added = await db.addRequest({
        userid: data.userid,
        username: data.username,
        email: data.email,
        phone: data.phone,
        date: dateTimeFormatted,
        semester: data.semester,
        category: data.category,
        request: data.request,
        status: "Pending",
        estimatedCompletion: estimatedCompletion
    });

    return added;
}

/**
 * getAllRequests
 * Retrieves all user requests from the database.
 * @returns {Array} - List of all requests.
 */
async function getAllRequests(){
    let allRequestsFound = await db.getAllRequests()
    return allRequestsFound
}

/**
 * getRequests
 * Retrieves all requests for a specific user.
 * @param {string} userid - The ID of the user.
 * @returns {Array} - List of requests associated with the user.
 */
async function getRequests(userid){
    let requestsFound = await db.getRequests(userid)
    return requestsFound
}

/**
 * cancelrequest
 * Cancels a request based on the request ID.
 * @param {string} requestId - ID of the request to cancel.
 * @returns {Object} - Result of the cancel operation.
 */
async function cancelrequest(requestId){
    result = await db.cancelRequest(requestId)
    return result
}

/**
 * ResolveRequest
 * Marks a request as resolved.
 * @param {string} requestId - ID of the request to resolve.
 * @returns {Object} - Result of the resolve operation.
 */
async function ResolveRequest(requestId){
    result = await db.ResolveRequest(requestId)
    return result
}

/**
 * RejectRequest
 * Marks a request as rejected.
 * @param {string} requestId - ID of the request to reject.
 * @returns {Object} - Result of the reject operation.
 */
async function RejectRequest(requestId){
    result = await db.RejectRequest(requestId)
    return result
}

/**
 * getCategoryRequests
 * Retrieves all requests for a specific category.
 * @param {string} category - Category to filter requests by.
 * @returns {Array} - List of requests in the specified category.
 */
async function getCategoryRequests(category){
   let requestsFound = await db.getCategoryRequests(category)
    return requestsFound;
}

/**
 * addNote
 * Adds a note to an existing request.
 * @param {string} id - ID of the request.
 * @param {string} note - Note content to add.
 */
async function addNote(id, note){
    await db.addNote(id, note)
}

/**
 * getRandomRequest
 * Retrieves a random request that is currently in "Pending" status.
 * @returns {Object} - A randomly selected pending request.
 */
async function getRandomRequest(){
    allRequests = await getAllRequests()
    let pendingRequests =[]
    
    for (let i = 0; i < allRequests.length; i++) {
        if (allRequests[i].status === "Pending") {
            pendingRequests.push(allRequests[i]);
    } }
    const randomIndex = Math.floor(Math.random() * pendingRequests.length);
    return pendingRequests[randomIndex];


}

module.exports= {
    createUser,
    getUserDetailsFromEmail,
    sendVerificationEmail,
    getUserVerifyKey,
    updateVerificationStatus,
    getUser,
    loginAttempt,
    fetchSession,
    passwordResetEmail,
    getUserFromPasswordResetKey,
    setNewPassword,
    validateUser,
    addRequest,
    getRequests,
    cancelrequest,
    getAllRequests,
    getCategoryRequests,
    RejectRequest,
    ResolveRequest,
    addNote,
    terminateSession,
    getRandomRequest,
    sendEmail,
    cancelToken
}