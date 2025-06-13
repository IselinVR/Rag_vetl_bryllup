const overskrift = document.getElementById("overskrift2");

overskrift.addEventListener("click", event =>{
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
    deleteGuest.textContent = "Fjern gjest";
    newGuest.appendChild(deleteGuest);

    const line = document.createElement("hr");    
    newGuest.prepend(line);

    deleteGuest.addEventListener("click", () => {
        guestContainer.removeChild(newGuest, line);
    });

});

