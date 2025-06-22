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

    const removeDiv = newGuest.querySelector("#regmail");
    if(removeDiv){
        newGuest.removeChild(removeDiv);
    }

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



const guestreg = document.getElementById("guestForm");
const emailInput = document.getElementById("email");

guestreg.addEventListener("submit", (event) => {
    event.preventDefault();

    // const emailValue = emailInput.value;
    // const emailIsValid = emailValue.includes("@") && emailValue.includes(".");

    if(!emailInput.checkValidity()){
       emailInput.setCustomValidity("Skriv inn en gyldig e-postadresse");
       emailInput.reportValidity();
       return;
    } else{
        emailInput.setCustomValidity("");
    }

    if (guestreg.checkValidity()) {
        window.location.href = "../confirmation/confirmation.html";
    } else {
        guestreg.reportValidity();
    }
});




