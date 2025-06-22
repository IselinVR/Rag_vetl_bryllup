const overskrift = document.getElementById("overskrift");

overskrift.addEventListener("click", () =>{
    window.location.href = "../forside/index.html";
});


const guestContainer = document.getElementById("guestcontainer");
const registerMore = document.getElementById("regflere");

let guestCount = 1;

registerMore.addEventListener("click", () =>{
    const firstGuest = document.querySelector(".guest");
    const newGuest = firstGuest.cloneNode(true);

    const radios = newGuest.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        const name = `attendance-${guestCount}`;
        radio.name = name;
        radio.checked = false;  
    });

    const inputs = newGuest.querySelectorAll('input[type="text"');
    inputs.forEach(input => input.value = "");

    guestContainer.appendChild(newGuest);
    guestCount++;

    const deleteGuest = document.createElement("button");
    deleteGuest.classList.add("deleteguest");
    deleteGuest.textContent = " Fjern gjest";
    newGuest.appendChild(deleteGuest);


    const minusIcon = document.createElement("i");
    minusIcon.setAttribute("class", "fa-solid fa-minus");
    deleteGuest.prepend(minusIcon);

    const line = document.createElement("hr");
    line.classList.add("line");    
    newGuest.prepend(line);

    deleteGuest.addEventListener("click", () => {
        guestContainer.removeChild(newGuest, line);
    });

});

const sendInn = document.getElementById("sendinn");
const regBox = document.getElementsByClassName("regboks");
const radio = document.getElementsByClassName("radio");


// sendInn.addEventListener("click", () =>{
//     window.location.href = "../confirmation/confirmation.html";
// });





//Eks. 2 (litt enklere måte)
// mysubmit.onclick = function(){
//     if(mycheckbox.checked){
//         subresult.textContent = `You are subscribed`;
//     }
//     else{
//         subresult.textContent = "You are not subscribed";
//     }
//     if(visabtn.checked){
//         paymentresult.textContent = `You are paying with Visa`;
//     }
//     else if(mastercardbtn.checked){
//         paymentresult.textContent = `You are paying with Mastercard`;
//     }
//     else if(vippsbtn.checked){
//         paymentresult.textContent = `You are paying with Vipps`;
//     }
//     else{
//         paymentresult.textContent = `You must choose a payment`;
//     }
// }

