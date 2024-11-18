/**
 * The Strategy Pattern is a behavioral design pattern that 
 * defines a family of algorithms, encapsulates each one, 
 * and makes them interchangeable. This pattern lets the 
 * algorithm vary independently from clients that use it.
 * 
 * Use Case in Frontend:
** Implementing different sorting or filtering algorithms for data.
** Handling different payment methods or authentication strategies.
** Switching between different ways of rendering components.
 */

class SortStrategry {
    sort(data) { }
}

class BubbleSort extends SortStrategry {
    sort(data) {
        console.log('Sorting with Bubble Sort')
    }
}

class QuickSort extends SortStrategry {
    sort(data) {
        console.log('Sorting with Quick Sort')

    }
}

class SortContext {
    setStrategry(strategy) {
        this.strategy = strategy
    }

    executeStrategy(data) {
        this.strategy.sort(data)
    }
}

const context = new SortContext()
context.setStrategry(new BubbleSort)
context.executeStrategy([5, 3, 8])

context.setStrategry(new QuickSort());
context.executeStrategy([5, 3, 8]);