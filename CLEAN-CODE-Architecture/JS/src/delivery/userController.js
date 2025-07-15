// Delivery/controller: handles input/output, calls use case
// This also demonstrates CLOSURE-BASED DEPENDENCY INJECTION

// CLOSURE EXPLANATION FOR CONTROLLER:
// This function returns another function that "closes over" the injected use case
// The inner function has access to createUserUseCase even after the outer function finishes

function userController({ createUserUseCase }) {
    // OUTER FUNCTION: Receives the use case dependency and stores it in closure scope
    // createUserUseCase is now "captured" in the closure

    return async function registerUser(req) {
        // INNER FUNCTION: Uses the captured use case from closure scope
        // This function "remembers" createUserUseCase from when it was created

        try {
            // Controller calls the use case with request data
            // createUserUseCase is available here thanks to the closure!
            const user = await createUserUseCase(req);

            // Controller formats successful response
            return { status: 201, body: user };
        } catch (err) {
            // Controller formats error response
            return { status: 400, body: { error: err.message } };
        }
    };
}

// WHY CLOSURE IN CONTROLLER?
// 1. The controller function has access to the injected use case
// 2. Use case is "baked in" when we call userController()
// 3. The returned function only needs request data - use case is already available
// 4. Easy to test - just inject a mock use case
// 5. Controller doesn't import the use case directly - it's injected

module.exports = { userController };
