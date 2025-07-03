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

document.getElementById('guestForm').addEventListener('submit', async (event) => {
  event.preventDefault();  
  const submitBtn = document.getElementById("sendinn");
  submitBtn.disabled = true;
  submitBtn.textContent = "SENDER...";

  const mainEmail = document.querySelector('.guest input[name="email"]').value.trim();

    const rows = Array.from(document.querySelectorAll('.guest')).map(div => {  
    const first_name = div.querySelector('input[name="first_name"]').value.trim()
    const last_name  = div.querySelector('input[name="last_name"]').value.trim()
    const attending  = div.querySelector('input[type="radio"]:checked').value === 'yes'
    const allergies  = div.querySelector('textarea[name="allergies"]').value.trim() || null

    return { first_name, last_name, email : mainEmail, attending, allergies }
  })

  const {data, error} = await supabase
    .from('responses')
    .insert(rows)

  if (error) {
    console.error('Supabase error:', error);
    submitBtn.disabled = false;
    submitBtn.textContent = "SEND INN";
    return alert('Det skjedde en feil under innsending. Prøv igjen senere.');
  }
  let summary = '';
  rows.forEach((guest, index) => {
  summary += `Gjest ${index + 1}:\n`;
  summary += `Navn: ${guest.first_name} ${guest.last_name}\n`;
  summary += `Kommer: ${guest.attending ? 'Ja' : 'Nei'}\n`;
  summary += `Allergier: ${guest.allergies || 'Ingen'}\n\n`;
});
  try {
    await emailjs.send(
      "service_o3qutk5",
      "template_3gkuh4k",
      { email: mainEmail, guest_summary: summary }
    );
  
    window.location.href = '../confirmation/confirmation.html';
  } catch (err) {
    console.error('EmailJS error:', err);
    alert('Det skjedde en feil under sending av e-post. Prøv igjen senere.');
    submitBtn.disabled = false;
    submitBtn.textContent = "SEND INN";
  }
});













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




