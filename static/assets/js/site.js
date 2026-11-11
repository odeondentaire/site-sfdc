// SFDC – scripts du site (menu mobile, envoi des formulaires)
(function () {
  "use strict";

  // Menu mobile
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav-principale");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // Formulaires (adhésion, contact) : envoi en JSON vers les fonctions Cloudflare
  document.querySelectorAll("form[data-endpoint]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector('button[type="submit"]');
    var startedAt = Date.now();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var data = {};
      new FormData(form).forEach(function (value, key) {
        if (data[key] !== undefined) {
          data[key] = [].concat(data[key], value);
        } else {
          data[key] = value;
        }
      });
      data._elapsed = Date.now() - startedAt;

      button.disabled = true;
      var label = button.textContent;
      button.textContent = "Envoi en cours…";
      status.className = "form-status";
      status.textContent = "";

      fetch(form.getAttribute("data-endpoint"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok || !body.ok) throw new Error(body.error || "Erreur " + res.status);
            return body;
          });
        })
        .then(function (body) {
          status.className = "form-status is-ok";
          status.textContent = form.getAttribute("data-success") || "Merci, votre message a bien été envoyé.";
          form.reset();
          if (body.redirect) {
            var a = document.createElement("a");
            a.href = body.redirect;
            a.className = "btn btn-primary";
            a.rel = "noopener";
            a.textContent = "Régler ma cotisation";
            status.appendChild(document.createElement("br"));
            status.appendChild(a);
          }
          status.focus();
        })
        .catch(function (err) {
          status.className = "form-status is-error";
          status.textContent =
            (err && err.message && err.message.indexOf("Erreur") !== 0 ? err.message + " " : "") +
            "L'envoi n'a pas abouti. Vous pouvez réessayer ou écrire à sfdc.dentcancer@gmail.com.";
          status.focus();
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = label;
        });
    });
  });

  // Bouton d'impression (fiche de liaison)
  document.querySelectorAll("[data-print]").forEach(function (btn) {
    btn.addEventListener("click", function () { window.print(); });
  });
})();
