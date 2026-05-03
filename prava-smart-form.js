document.addEventListener("DOMContentLoaded", function () {
  console.log("PRAVA NEW SCRIPT LOADED");

  const page = document.querySelector(".sf-page.sf-page-prava");
  console.log("page:", page);

  const form = page ? page.querySelector("form") : null;
  console.log("form:", form);

  const questions = form ? form.querySelectorAll(".question-wrap-prava") : [];
  console.log("questions:", questions.length);
});
