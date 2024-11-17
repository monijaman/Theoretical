/*
"async and await make promises easier to write"
async makes a function return a Promise
await makes a function wait for a Promise
 */

async function fetchToDos() {
    try {
        const todoResponse = await fetch('https://jsonplaceholder.typicode.com/todos/1');
        const todoData = await todoResponse.json();
        const postResponse = await fetch('https://jsonplaceholder.typicode.com/posts/1')
        const postData = await postResponse.json();

        console.log(`Weather: ${todoData.title}`)
        console.log(`Post: ${postData.title}`)
    } catch (error) {

    }
}

fetchToDos();