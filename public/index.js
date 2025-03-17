document.addEventListener('DOMContentLoaded', () => {
  const initialForm = document.getElementById('initial-form');
  const questionsForm = document.getElementById('questions-form');
  const questionsContainer = document.getElementById('questions-container');
  const adviceContainer = document.getElementById('advice-container');
  const loadingOverlay = document.getElementById('loading-overlay');
  const introSection = document.getElementById('intro-section');

  // Function to show loading screen
  const showLoading = () => {
    loadingOverlay.style.display = 'flex';
  };

  // Function to hide loading screen
  const hideLoading = () => {
    loadingOverlay.style.display = 'none';
  };

  // Handle Initial Form Submission (Get Questions)
  initialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('category').value;
    const advice_style = document.querySelector('input[name="advice_style"]:checked').value;
    const mood = document.getElementById('mood').value;

    try {
      showLoading();
      const response = await fetch('/get-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, advice_style, mood }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.questions && result.questions.length === 3) {
          introSection.style.display = 'none'; // Hide intro section
          initialForm.style.display = 'none';
          questionsForm.style.display = 'block';

          questionsContainer.innerHTML = `
            <input type="hidden" name="category" value="${category}">
            <input type="hidden" name="advice_style" value="${advice_style}">
            <input type="hidden" name="mood" value="${mood}">
          `;
          result.questions.forEach((question, index) => {
            questionsContainer.innerHTML += `
              <div class="choice-container">
                <label for="answer${index}">Question ${index + 1}: ${question}</label>
                <input type="hidden" name="question${index}" value="${question}">
                <input type="text" id="answer${index}" name="answer${index}" placeholder="Your answer" required>
              </div>
            `;
          });
        } else {
          alert('Failed to retrieve questions. Please try again.');
        }
      } else {
        if (response.status === 401) {
          alert('You need to log in to get advice. Redirecting to login...');
          window.location.href = '/auth/google';
        } else {
          alert(result.error || 'An error occurred. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      alert('A network error occurred. Please check your connection and try again.');
    } finally {
      hideLoading();
    }
  });

  // Handle Questions Form Submission (Get Advice)
  questionsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(questionsForm);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    const requiredFields = ['category', 'advice_style', 'mood', 'question0', 'question1', 'question2', 'answer0', 'answer1', 'answer2'];
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      alert(`Missing fields: ${missingFields.join(', ')}. Please fill all answers.`);
      return;
    }

    try {
      showLoading();
      const response = await fetch('/get-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.advice) {
          introSection.style.display = 'none'; // Ensure intro section is hidden
          questionsForm.style.display = 'none';
          adviceContainer.style.display = 'block'; // Ensure advice container is visible
          adviceContainer.innerHTML = `
            <h2>Your Personalized Advice</h2>
            <p class="advice-text">${result.advice}</p>
          `;
        } else {
          alert('Failed to retrieve advice. Please try again.');
        }
      } else {
        if (response.status === 401) {
          alert('You need to log in to get advice. Redirecting to login...');
          window.location.href = '/auth/google';
        } else if (response.status === 400) {
          alert(result.error || 'Bad request. Please check your input.');
        } else {
          alert(result.error || 'An error occurred. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error fetching advice:', error);
      alert('A network error occurred. Please check your connection and try again.');
    } finally {
      hideLoading();
    }
  });
});