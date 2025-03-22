// Independent JavaScript for the begin page
document.addEventListener('DOMContentLoaded', function() {
  // Hide loading overlay
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
    loadingOverlay.style.opacity = '0';
  }
  
  // Setup form elements
  const initialForm = document.getElementById('initial-form');
  const questionsForm = document.getElementById('questions-form');
  const adviceContainer = document.getElementById('advice-container');
  
  // Setup questions form
  if (questionsForm) {
    questionsForm.style.display = 'none'; // Initially hidden
    
    questionsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitQuestionsForm(questionsForm);
    });
  }
  
  // Setup advice container
  if (adviceContainer) {
    adviceContainer.style.display = 'none'; // Initially hidden
    
    // Create the advice content element if it doesn't exist
    if (!document.getElementById('advice-content')) {
      const adviceContent = document.createElement('div');
      adviceContent.id = 'advice-content';
      adviceContent.className = 'advice-content';
      adviceContainer.prepend(adviceContent);
    }
  }
  
  // Add event listener to initial form
  if (initialForm) {
    initialForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitInitialForm(initialForm);
    });
  }
});

// Form submission function
function submitInitialForm(form) {
  // Get form values
  const category = document.getElementById('category').value;
  const advice_style = document.querySelector('input[name="advice_style"]:checked')?.value;
  const mood = document.getElementById('mood').value;
  
  if (!category || !advice_style || !mood) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Show loading indicator
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '1';
    loadingOverlay.classList.add('active');
    
    // Update loading text
    const loaderText = loadingOverlay.querySelector('.loader-text');
    if (loaderText) {
      loaderText.textContent = 'Generating your personalized questions...';
    }
  }
  
  // Submit using fetch API
  fetch('/get-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, advice_style, mood }),
    credentials: 'same-origin'
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error('Server error');
    }
    return response.json();
  })
  .then(result => {
    if (result.questions && result.questions.length === 3) {
      // Handle successful response
      const introSection = document.getElementById('intro-section');
      const initialForm = document.getElementById('initial-form');
      const questionsForm = document.getElementById('questions-form');
      const questionsContainer = document.getElementById('questions-container');
      
      if (introSection) introSection.style.display = 'none';
      if (initialForm) initialForm.style.display = 'none';
      
      if (questionsContainer) {
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
              <textarea id="answer${index}" name="answer${index}" placeholder="Your answer" required></textarea>
            </div>
          `;
        });
      }
      
      if (questionsForm) {
        questionsForm.style.display = 'block';
      }
    } else {
      alert('Failed to retrieve questions. Please try again.');
    }
  })
  .catch(error => {
    if (error.message === 'Unauthorized') {
      window.location.href = '/login';
    } else {
      alert('An error occurred: ' + error.message);
    }
  })
  .finally(() => {
    // Hide loading indicator
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
      loadingOverlay.style.opacity = '0';
      loadingOverlay.classList.remove('active');
    }
  });
}

// Questions form submission function
function submitQuestionsForm(form) {
  // Get form data
  const formData = new FormData(form);
  const formObject = {};
  
  formData.forEach((value, key) => {
    formObject[key] = value;
  });
  
  // Show loading indicator
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '1';
    
    // Update loading text
    const loaderText = loadingOverlay.querySelector('.loader-text');
    if (loaderText) {
      loaderText.textContent = 'Generating your personalized advice...';
    }
  }
  
  // Submit using fetch API
  fetch('/get-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formObject),
    credentials: 'same-origin'
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error('Server error');
    }
    return response.json();
  })
  .then(result => {
    if (result.advice) {
      // Handle successful response
      const questionsForm = document.getElementById('questions-form');
      const adviceContainer = document.getElementById('advice-container');
      const adviceContent = document.getElementById('advice-content');
      
      if (questionsForm) questionsForm.style.display = 'none';
      
      if (adviceContent) {
        adviceContent.innerHTML = `
          <h2>Your Personalized Advice</h2>
          <div class="advice-text">${result.advice}</div>
        `;
      }
      
      if (adviceContainer) {
        adviceContainer.style.display = 'block';
      }
    } else {
      alert('Failed to retrieve advice. Please try again.');
    }
  })
  .catch(error => {
    if (error.message === 'Unauthorized') {
      window.location.href = '/login';
    } else {
      alert('An error occurred: ' + error.message);
    }
  })
  .finally(() => {
    // Hide loading indicator
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
      loadingOverlay.style.opacity = '0';
    }
  });
}
