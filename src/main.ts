import { sayHello } from './todo/todo';

function showHello(divName: string, name: string) {
    const elt = document.getElementById(divName);
    elt.innerText = sayHello(name);
}

showHello('greeting', 'Jessica 34567 !!');