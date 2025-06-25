import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
const SUPA_URL = 'https://bevrttmvumfodpkauiio.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldnJ0dG12dW1mb2Rwa2F1aWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MTE4NjksImV4cCI6MjA2NjE4Nzg2OX0.DEZl36UgcM_KOlnbVlxfIdW_ZRdmkAMbbdHfF3KLCyk'
const supabase = createClient(SUPA_URL, SUPA_KEY)



const overskrift = document.getElementById("overskrift");

overskrift.addEventListener("click", () =>{
    window.location.href = "../index.html";
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

    const textarea = newGuest.querySelector('textarea[name="allergies"]');
    if(textarea) textarea.value = '';

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

document.getElementById('guestForm').addEventListener('submit', async (e) => {
  e.preventDefault()  // Prevent the default page reload
const mainEmail      = document.querySelector('.guest input[name="email"]').value.trim();

  // Build an array of "row" objects—one per .guest block
  const rows = Array.from(document.querySelectorAll('.guest')).map(div => {
    // Grab each field by name
    const first_name = div.querySelector('input[name="first_name"]').value.trim()
    const last_name  = div.querySelector('input[name="last_name"]').value.trim()
    
    // The radio that’s checked: "yes" → true, else false
    const attending  = div.querySelector('input[type="radio"]:checked').value === 'yes'
    // If textarea is blank, store null (so your DB sees it as empty)
    const allergies  = div.querySelector('textarea[name="allergies"]').value.trim() || null

    return { first_name, last_name, email : mainEmail, attending, allergies }
  })

  // Insert all rows into Supabase in one go
  const { data, error } = await supabase
    .from('responses')
    .insert(rows)

  if (error) {
    console.error('Supabase error:', error)
    return alert('Det skjedde en feil under innsending. Prøv igjen senere.')
  }

  window.location.href = '../confirmation/confirmation.html'
})

// const guestreg = document.getElementById("guestForm");
// const emailInput = document.getElementById("email");

// guestreg.addEventListener("submit", (event) => {
//     event.preventDefault();

//     if(!emailInput.checkValidity()){
//        emailInput.setCustomValidity("Skriv inn en gyldig e-postadresse");
//        emailInput.reportValidity();
//        return;
//     } else{
//         emailInput.setCustomValidity("");
//     }

//     if (guestreg.checkValidity()) {
//         window.location.href = "../confirmation/confirmation.html";
//     } else {
//         guestreg.reportValidity();
//     }
// });




