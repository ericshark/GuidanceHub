// Handle Initial Form Submission
document.getElementById('initial-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const category = document.getElementById('category').value;
  const advice_type = document.querySelector('input[name="advice_type"]:checked').value;

  try {
    const response = await fetch('/get-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, advice_type }),
    });
    const data = await response.json();
    if (data.questions && data.questions.length === 5) {
      // Hide initial form and show questions form
      document.getElementById('initial-form').style.display = 'none';
      const questionsForm = document.getElementById('questions-form');
      questionsForm.style.display = 'block';

      // Populate questions
      const questionsContainer = document.getElementById('questions-container');
      questionsContainer.innerHTML = `
        <input type="hidden" name="category" value="${category}">
        <input type="hidden" name="advice_type" value="${advice_type}">
      `;
      data.questions.forEach((question, index) => {
        questionsContainer.innerHTML += `
          <div>
            <p>Question ${index + 1}: ${question}</p>
            <input type="hidden" name="question${index}" value="${question}">
            <input type="text" name="answer${index}" required>
          </div>
        `;
      });
    } else {
      alert('Failed to retrieve questions. Please try again.');
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
    alert('An error occurred. Please try again.');
  }
});

// Handle Questions Form Submission
document.getElementById('questions-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/get-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.advice) {
      // Display advice and hide questions form
      document.getElementById('questions-form').style.display = 'none';
      const adviceContainer = document.getElementById('advice-container');
    
      adviceContainer.innerHTML = `
        <h2>Your Personalized Advice</h2>
        <p class="color">${result.advice}</p>
      `;
    } else {
      alert('Failed to retrieve advice. Please try again.');
    }
  } catch (error) {
    console.error('Error fetching advice:', error);
    alert('An error occurred. Please try again.');
  }
});