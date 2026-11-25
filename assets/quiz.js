/*
  Reusable multiple-choice quiz component.

  Usage in a lesson:
    <link rel="stylesheet" href="../assets/quiz.css">
    <div class="quiz" data-quiz="quiz-data" data-lesson="0001"></div>
    <script type="application/json" id="quiz-data">
      [{ "topic": "Stops",
         "q": "Question text (HTML allowed)",
         "options": ["A", "B", "C", "D"],
         "answer": 2,                       // index of the correct option
         "explain": "Why (HTML allowed, may include citation links)" }]
    </script>
    <script src="../assets/quiz.js" defer></script>

  Each question locks after one answer and gives immediate feedback.
  When all are answered, it shows a score plus a one-line result the
  learner can copy and paste back to their teacher.
*/
(function () {
  "use strict";

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function copyText(text, button) {
    function done() {
      var old = button.textContent;
      button.textContent = "Copied";
      setTimeout(function () { button.textContent = old; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { /* user can copy manually */ }
      document.body.removeChild(ta);
    }
  }

  function build(root) {
    var dataEl = document.getElementById(root.getAttribute("data-quiz"));
    if (!dataEl) return;
    var questions = JSON.parse(dataEl.textContent);
    var lesson = root.getAttribute("data-lesson") || "";
    var results = new Array(questions.length);
    var letters = "ABCDEFGH";

    var progress = el("p", "quiz-progress");
    root.appendChild(progress);

    function updateProgress() {
      var answered = results.filter(function (r) { return r !== undefined; }).length;
      var right = results.filter(function (r) { return r === true; }).length;
      progress.textContent = answered + " of " + questions.length + " answered · " + right + " correct";
    }

    questions.forEach(function (item, qi) {
      var card = el("section", "quiz-q");
      card.appendChild(el("p", "quiz-topic", (qi + 1) + " · " + item.topic));
      card.appendChild(el("p", "quiz-stem", item.q));

      var list = el("div", "quiz-options");
      var feedback = el("div", "quiz-feedback");
      feedback.hidden = true;

      item.options.forEach(function (opt, oi) {
        var b = el("button", "quiz-opt");
        b.type = "button";
        b.innerHTML = '<span class="quiz-letter">' + letters[oi] + "</span><span>" + opt + "</span>";
        b.addEventListener("click", function () {
          if (results[qi] !== undefined) return;
          var correct = oi === item.answer;
          results[qi] = correct;
          Array.prototype.forEach.call(list.children, function (c, ci) {
            c.disabled = true;
            if (ci === item.answer) c.classList.add("is-correct");
          });
          if (!correct) b.classList.add("is-wrong");
          feedback.className = "quiz-feedback " + (correct ? "good" : "bad");
          feedback.innerHTML = "<strong>" + (correct ? "Correct." : "Not quite. The answer is " + letters[item.answer] + ".") +
            "</strong> " + item.explain;
          feedback.hidden = false;
          updateProgress();
          if (results.every(function (r) { return r !== undefined; })) finish();
        });
        list.appendChild(b);
      });

      card.appendChild(list);
      card.appendChild(feedback);
      root.appendChild(card);
    });

    var summary = el("section", "quiz-summary");
    summary.hidden = true;
    root.appendChild(summary);

    function finish() {
      var right = results.filter(Boolean).length;
      var missed = [];
      results.forEach(function (r, i) { if (!r) missed.push("Q" + (i + 1) + " " + questions[i].topic); });
      var line = "Lesson " + lesson + " result: " + right + "/" + questions.length +
        (missed.length ? "; missed: " + missed.join(", ") : "; nothing missed");
      summary.innerHTML =
        '<p class="quiz-score">' + right + " / " + questions.length + "</p>" +
        "<p>Copy this line and paste it to your teacher (Claude) so the next lesson can target your gaps:</p>";
      var pre = el("pre", "quiz-line");
      pre.textContent = line;
      var btn = el("button", "quiz-copy", "Copy result");
      btn.type = "button";
      btn.addEventListener("click", function () { copyText(line, btn); });
      summary.appendChild(pre);
      summary.appendChild(btn);
      summary.hidden = false;
    }

    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".quiz[data-quiz]"), build);
  });
})();
