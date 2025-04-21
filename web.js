const express = require('express');
const business = require('./business.js');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const handlebars = require('express-handlebars');
const fileUpload = require('express-fileupload');

const app = express();

app.set('views', __dirname + "/templates");
app.set('view engine', 'handlebars');
app.engine('handlebars', handlebars.engine());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload());
app.use('/', express.static(__dirname + "/static"));

/**
 * This is the main page for this website
 * @params {req, res} 
 * 
 */
app.get('/', (req, res) => {
    res.render('index')
});

app.get('/logout', async (req, res) => {
    await business.terminateSession(req.cookies.session)
    res.clearCookie('session')
    res.redirect('/')
})

/**
 * This is the registration page for this website
 * @params {req, res} 
 * 
 */
app.get('/register', (req, res) => {
    res.render('register')
});

/**
 * Users are redirected to this page upon registration to verify their email.
 * @params {req, res} 
 * 
 */
app.get("/verify", async (req, res) => {
	const key = req.query.key;
	const user = await business.getUserVerifyKey(key);
	if (key && !user) {
		res.redirect("/login?message=Invalid or expired verification email, please try again");
		return;
	}
    business.updateVerificationStatus(user.userid)
	res.redirect("/login?message=Thank you for verifying. You can log in");
});

/**
 * User registration inputs are validated, if all input is correct, an email verification link is sent.
 * @params {req, res} 
 * 
 */
app.post('/register', async (req, res) => {
    let result = await business.validateUser(req.body.userid, req.body.name, req.body.password, req.body.email, req.body.phone, req.body.major);
    if (result == true){
    await business.createUser(req.body.userid, req.body.name, req.body.password, req.body.email, req.body.phone, req.body.major);
    const userEmail = req.body.email;
	const user = await business.getUserDetailsFromEmail(userEmail);
	await business.sendVerificationEmail(user);
    res.redirect("/login?message=verification email sent, Check your inbox");
    }else{
        res.redirect(`/login?message=${encodeURIComponent(result)}`);
    }
    
});

/**
 * This is the login page for this website
 * @params {req, res} 
 * 
 */
app.get('/login', (req, res) => {
    const message = req.query.message;
    res.render('login', {
        message
    });
});

/**
 * This is the login post where the we verify login, sessions are created and assigned based on the role of the user logging in (Student or staff)
 * @params {req, res} 
 * 
 */
app.post('/login', async (req, res) => {
    let userid = req.body.userid
    let data = await business.getUser(userid)
    let user = data[0]
    const session = await business.loginAttempt(req.body.userid, req.body.password)
    if(session) {
        res.cookie('session', session.key, { expires: session.expiry });
        if (user.accountType == "Staff"){
            console.log("reached")
            res.redirect("instructorDashboard")
        }else if (user.accountType == "Student"){
            res.redirect("studentDashboard")
        }else{
            res.send("Invalid user")
        }
    } else{
        res.redirect("/login?message=Your username or password is incorrect")
    }
});

/**
 * This is the student page for this website. Only students with valid credentials can access this,
 * it also prevents CSRF by other roles who dont have access to this page from entering through the
 * session cookies.
 * @params {req, res} 
 * 
 */
app.get('/studentDashboard', async(req, res) => {
    const session = await business.fetchSession(req.cookies.session)
    const message = req.query.message;
    if(!session) {
        res.redirect('/login?message=Please login to access this page')
        return
    }
    let userId= session.data.userID
    let userdata = await business.getUser(userId)
    let userinfo = userdata[0]
    const data = await business.getUser(session.data.userID)
    let user = data[0]
    if (user.accountType == "Student"){
        res.render('studentDashboard', {
            userinfo: userinfo,
            message: message
            });
    }else{
        
        res.redirect('/login?message=Please login to access this page')
    }
    
});

/**
 * This is the instructor page for this website. Only instructors with valid credentials can access this,
 * it also prevents CSRF by other roles who dont have access to this page from entering through the
 * session cookies.
 * @params {req, res} 
 * 
 */
app.get('/instructorDashboard', async (req, res) => {
    const session = await business.fetchSession(req.cookies.session)
    const message = req.query.message;
    if(!session) {
        res.redirect('/login?message=Please login to access this page')
        return
    }
    let userId= session.data.userID
    let userdata = await business.getUser(userId)
    let userinfo = userdata[0]
    const data = await business.getUser(session.data.userID)
    let user = data[0]
    if (user.accountType == "Staff"){
    let allRequests = await business.getAllRequests()
    let pendingRequests =[]
    for (let i = 0; i < allRequests.length; i++) {
        if (allRequests[i].status === "Pending") {
            pendingRequests.push(allRequests[i]);
    } }
    let courseRegQueue = 0
    let capstoneQueue = 0
    let complaintQueue = 0
    let otherQueue = 0
    for (request of pendingRequests){
        if (request.category == "CourseRegistration"){
            courseRegQueue++
        }
        if (request.category == "Capstone"){
            capstoneQueue++
        }
        if (request.category == "Complaint"){
            complaintQueue++
        }
        if (request.category == "Other"){
            otherQueue++
        }
    }
        res.render('instructorDashboard', {
            userinfo: userinfo,
            message: message,
            courseRegQueue: courseRegQueue,
            capstoneQueue: capstoneQueue,
            complaintQueue: complaintQueue,
            otherQueue: otherQueue
            });
    }else{
        
        res.redirect('/login?message=Please login to access this page')
    }
    
});

/**
 * This is renders the forgot password page after the link is clicked.
 * @params {req, res} 
 * 
 */
app.get("/forgot-password", (req, res) => {
	res.render("forgotPassword", { layout: 'main' });
});

/**
 * This is checks the email for existence in the database, then sends a password reset link with a uniqe key.
 * @params {req, res} 
 * 
 */
 app.post("/forgot-password", async (req, res) => {
	const userEmail = req.body.email;
	const user = await business.getUserDetailsFromEmail(userEmail);
	
	if (user) {
		await business.passwordResetEmail(user);
		return res.redirect("/login?message=Password reset email sent, Check your inbox");
	} else {
		return res.redirect("/login?message=This email does not exist");
	}
});


/**
 * Fetches the user information based on their unique password key to ensure it hasn't expired then displays the password reset page.
 * @params {req, res} 
 * 
 */
app.get("/reset-password", async (req, res) => {
    const message = req.query.message;
	const key = req.query.key;
	const user = await business.getUserFromPasswordResetKey(key);
	if (key && !user) {
		res.redirect("/login?message=Invalid or expired password reset email, please try again");
		return;
	}
	res.render("resetPassword",{
        key: key,
        message: message
    });
});


/**
 *Ensures the two entered passwords match, otherwise displays a conformation message of changed password.
 * @params {req, res} 
 * 
 */
app.post("/reset-password", async (req, res) => {
	const key = req.body.reset_key;
    const pass1 = req.body.pass;
    const pass2 = req.body.repeat_pass;
    console.log("key from web: " + key)

    if(pass1 != pass2) {
        res.redirect(`/reset-password?message=Your passwords do not match&key=${key}`)
    } else {
        await business.setNewPassword(key, pass1);
        res.redirect('/login?message=Password changed successfully!')
    }
});

/**
 * Submits a new request from a student.
 * Adds the request to the database and redirects based on success or failure.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.post("/newRequest", async (req, res) => {
    let data = req.body
	let addRequest = await business.addRequest(data)
    if (addRequest){
        res.redirect("/studentDashboard?message=We have received your request, thank you.");
		return;
    }
    res.redirect("/studentDashboard?message=Request addition failed, please try again.");
		return;
});


/**
 * Retrieves and categorizes all requests submitted by a specific user.
 * Renders the allRequests page showing pending, resolved/rejected, and cancelled requests.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.post("/allRequests", async (req, res) => {
    let userID = req.body.userid;
    let requests = await business.getRequests(userID);

    let pendingRequests = [];
    let actionedRequests = [];
    let cancelledRequests = [];

    for (let i = 0; i < requests.length; i++) {
        if (requests[i].status === "Cancelled") {
            cancelledRequests.push(requests[i]);
        } 
        if (requests[i].status === "Pending") {
            pendingRequests.push(requests[i]);
        } 
        if (requests[i].status === "Resolved" || requests[i].status === "Rejected") {
            actionedRequests.push(requests[i]);
        } 
    }
    res.render("allRequests", {
        userid: userID,
        pendingRequests: pendingRequests,
        actionedRequests: actionedRequests,
        cancelledRequests: cancelledRequests,
    });
});

/**
 * Filters requests by semester and categorizes them based on status.
 * Renders the allRequests page with selected semester's requests.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.post("/filteredBySemester", async (req, res) => {
    const userID = req.body.userid;
    const semester = req.body.semester;

    const requests = await business.getRequests(userID);

    let pendingRequests = [];
    let actionedRequests = [];
    let cancelledRequests = [];

    if (semester === "allSemesters" || semester === "") {
        for (let i = 0; i < requests.length; i++) {
            if (requests[i].status === "Cancelled") {
                cancelledRequests.push(requests[i]);
            } else if(requests[i].status === "Pending"){
                pendingRequests.push(requests[i]);
            }else{
                actionedRequests.push(requests[i]);
            }
        }
    } else {
        for (let i = 0; i < requests.length; i++) {
            if (requests[i].semester === semester) {
                if (requests[i].status === "Cancelled") {
                    cancelledRequests.push(requests[i]);
                } else if(requests[i].status === "Pending"){
                    pendingRequests.push(requests[i]);
                }else{
                    actionedRequests.push(requests[i]);
                }}
        }
    }
    res.render("allRequests", {
        userid: userID,
        pendingRequests: pendingRequests,
        actionedRequests: actionedRequests,
        cancelledRequests: cancelledRequests,
        selectedSemester: semester, 
    });
});

/**
 * Cancels a user’s request and re-renders the requests list with an appropriate message.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.post("/cancelRequest", async (req, res) => {
    let requestId = req.body.id;
    let userId = req.body.userid;

    let cancelled = await business.cancelrequest(requestId);
    let requests = await business.getRequests(userId);

    let pendingRequests = [];
    let actionedRequests = [];
    let cancelledRequests = [];

    for (let i = 0; i < requests.length; i++) {
        if (requests[i].status === "Cancelled") {
            cancelledRequests.push(requests[i]);
        } 
        if (requests[i].status === "Pending") {
            pendingRequests.push(requests[i]);
        } 
        if (requests[i].status === "Resolved" || requests[i].status === "Rejected") {
            actionedRequests.push(requests[i]);
        } 
    }
    res.render("allRequests", {
        userid: userId,
        pendingRequests: pendingRequests,
        actionedRequests: actionedRequests,
        cancelledRequests: cancelledRequests,
        message: cancelled
            ? "We have cancelled your request, thank you."
            : "Request cancellation failed, please try again.",
    });
});

/**
 * Displays a list of all pending requests in a given category.
 * Validates the session and CSRF token for security.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.get('/queue/:category', async(req, res) => {
    let message = req.query.message
    category = req.params.category
    let requests = await business.getCategoryRequests(category)
    const session = await business.fetchSession(req.cookies.session);
    
    const csrfToken = session.csrfToken;
    console.log("sssssssessionn:  ",csrfToken)
    let pendingRequests =[]
    for (let i = 0; i < requests.length; i++) {
        if (requests[i].status === "Pending") {
            pendingRequests.push(requests[i]);
    } }
    res.render('categoryRequests',{
    category: category,
    requests: pendingRequests,
    message:message,
    token : csrfToken
})

});

/**
 * Handles an instructor’s action on a student request (resolve/reject).
 * Validates CSRF token and sends notification email after updating.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.post("/handleRequest", async (req, res) => {
    let key = req.cookies.session
    let sd = await business.fetchSession(key)
    let category = req.body.category
    let requestStatus = req.body.action;
    let userid = req.body.userid;
    let requestId = req.body.id
    let requestNote = req.body.note;
    let token = req.body.csrfToken
    if (sd.csrfToken!= token){
        res.status(419)
        res.send('CSRF TOKEN MISMATCH')
        return
    }

    let user = await business.getUser(userid)
    let userInfo = user[0]
    if (requestStatus == "Rejected"){
        await business.RejectRequest(requestId)
    }else{
        await business.ResolveRequest(requestId)
    }
    await business.addNote(requestId, requestNote)
    await business.sendEmail(userInfo.name,"Request Actioned", "Request has been actioned")
    res.redirect(`/queue/${category}?message=We have submitted your action, thank you.`);
});

/**
 * Selects and renders a random pending request from all categories.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
app.post("/randomRequest", async (req, res) => {
    let randomRequest = await business.getRandomRequest();
    res.render('randomRequest', {
        request: randomRequest,
    });
});




app.listen(8000, () => {
    console.log("Server running on http://localhost:8000");
});