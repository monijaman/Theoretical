/*
 A Promise represents the eventual completion (or failure) of an asynchronous operation and its resulting value.
 */

function deliverPackage(orderId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (orderId) {
                resolve('Package Delivered')
            } else {
                reject('Order ID not found')
            }
        }, 2000);
    })
}

deliverPackage('')
    .then(response => console.log(response))
    .catch(error => console.log(error))

