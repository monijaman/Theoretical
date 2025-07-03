// User repository: in-memory implementation (could be replaced with DB)
const users = [];

function saveUser(user) {
    users.push(user);
    return user;
}

function getUserByEmail(email) {
    return users.find(u => u.email === email) || null;
}

module.exports = { saveUser, getUserByEmail };
