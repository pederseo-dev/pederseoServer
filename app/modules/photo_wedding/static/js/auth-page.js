async function goToNextStep() {
  const res = await apiFetch("/photo-wedding/players/me");
  if (res.status === 404) {
    window.location.href = "/registro.html";
  } else if (res.ok) {
    window.location.href = "/juego.html";
  } else {
    document.getElementById("error-msg").textContent = "Error inesperado, intentá de nuevo";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await goToNextStep();
    return;
  }

  const form = document.getElementById("auth-form");
  const errorMsg = document.getElementById("error-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      errorMsg.textContent = "Email o contraseña incorrectos";
      return;
    }
    await goToNextStep();
  });

  document.getElementById("signup-btn").addEventListener("click", async () => {
    errorMsg.textContent = "";
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (!email || !password) {
      errorMsg.textContent = "Completá email y contraseña primero";
      return;
    }

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      errorMsg.textContent = error.message;
      return;
    }
    await goToNextStep();
  });
});
