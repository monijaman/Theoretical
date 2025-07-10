// Delivery/controller: handles input/output, calls use case
function userController({ createUserUseCase }) {
    return async function registerUser(req) {
        try {
            const user = await createUserUseCase(req);
            return { status: 201, body: user };
        } catch (err) {
            return { status: 400, body: { error: err.message } };
        }
    };
}

module.exports = { userController };
