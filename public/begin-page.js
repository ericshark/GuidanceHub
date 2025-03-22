// Independent JavaScript for the begin page
document.addEventListener('DOMContentLoaded', function() {
  // Force hide loading overlay
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
    loadingOverlay.style.opacity = '0';
    loadingOverlay.style.pointerEvents = 'none';
  }
  
  // Setup form elements
  const initialForm = document.getElementById('initial-form');
  if (initialForm) {
    initialForm.style.display = 'block';
    initialForm.style.pointerEvents = 'auto';
    initialForm.style.position = 'relative';
    initialForm.style.zIndex = '1000';
    
    // Add direct event listener to form
    initialForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitInitialForm(initialForm);
    });
    
    // Ensure all form elements are interactive
    const formInputs = initialForm.querySelectorAll('input, select, button, label');
    formInputs.forEach(function(element) {
      element.style.pointerEvents = 'auto';
      element.style.cursor = 'pointer';
      element.style.position = 'relative';
      element.style.zIndex = '1001';
    });
  }
  
  // Setup questions form
  const questionsForm = document.getElementById('questions-form');
  const adviceContainer = document.getElementById('advice-container');
  
  if (questionsForm) {
    questionsForm.style.display = 'none'; // Initially hidden
    
    questionsForm.addEventListener('submit', function(e) {
      e.preventDefault();
      submitQuestionsForm(questionsForm);
    });
    
    // Make form elements interactive
    const questionInputs = questionsForm.querySelectorAll('input, button');
    questionInputs.forEach(function(element) {
      element.style.pointerEvents = 'auto';
      element.style.cursor = 'pointer';
      element.style.position = 'relative';
      element.style.zIndex = '1001';
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
});

// Form submission function (independent implementation)
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
    loadingOverlay.style.pointerEvents = 'auto';
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
              <input type="text" id="answer${index}" name="answer${index}" placeholder="Your answer" required>
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
      const confirmLogin = confirm('You need to log in to get advice. Would you like to log in now?');
      if (confirmLogin) {
        window.location.href = '/auth/google';
      }
    } else {
      alert('An error occurred: ' + error.message);
    }
  })
  .finally(() => {
    // Hide loading indicator
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
      loadingOverlay.style.opacity = '0';
      loadingOverlay.style.pointerEvents = 'none';
      loadingOverlay.classList.remove('active');
    }
  });
}

// Questions form submission function
function submitQuestionsForm(form) {
  // Get all data from the form
  const formData = new FormData(form);
  const formObject = {};
  
  formData.forEach((value, key) => {
    formObject[key] = value;
  });
  
  // Check if all answers are provided
  for (let i = 0; i < 3; i++) {
    if (!formObject[`answer${i}`]) {
      alert('Please answer all questions');
      return;
    }
  }
  
  // Show loading indicator with updated text
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '1';
    loadingOverlay.style.pointerEvents = 'auto';
    loadingOverlay.classList.add('active');
    
    // Update loading text
    const loaderText = loadingOverlay.querySelector('.loader-text');
    if (loaderText) {
      loaderText.textContent = 'Analyzing your answers and crafting the perfect advice...';
    }
  }
  
  // Submit data to server
  fetch('/get-advice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formObject),
    credentials: 'same-origin'
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error(`Server error: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // Check if there's valid advice data
    if (!data || !data.advice) {
      alert('No advice data received from server. Please try again.');
      return;
    }
    
    // Hide questions form
    const questionsForm = document.getElementById('questions-form');
    if (questionsForm) {
      questionsForm.style.display = 'none';
    }
    
    // Display advice
    const adviceContainer = document.getElementById('advice-container');
    
    if (!adviceContainer) {
      alert('Could not find advice container element. Please reload the page.');
      return;
    }
    
    // Get or create the advice content element
    let adviceContent = document.getElementById('advice-content');
    if (!adviceContent) {
      adviceContent = document.createElement('div');
      adviceContent.id = 'advice-content';
      adviceContent.className = 'advice-content';
      adviceContainer.prepend(adviceContent);
    }
    
    try {
      // Clear any existing content and add new advice
      adviceContent.innerHTML = '';
      
      // Format the advice with proper styling
      let formattedAdvice = data.advice;
      
      // Clean and format advice text
      formattedAdvice = formattedAdvice.replace(/\n\n/g, '</p><p>');
      
      // Add header and wrap in paragraph tags
      formattedAdvice = `<h3>Your Personalized Advice</h3><p>${formattedAdvice}</p>`;
      
      // Set the content
      adviceContent.innerHTML = formattedAdvice;
      
      // Make sure adviceContainer is visible and has active class
      adviceContainer.style.display = 'block';
      
      // Use a timeout to allow the browser to render before adding the active class
      setTimeout(() => {
        adviceContainer.classList.add('active');
        // Scroll to the advice
        adviceContainer.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      alert('Error displaying advice: ' + error.message);
    }
  })
  .catch(error => {
    if (error.message === 'Unauthorized') {
      const confirmLogin = confirm('You need to log in to get advice. Would you like to log in now?');
      if (confirmLogin) {
        window.location.href = '/auth/google';
      }
    } else {
      alert('An error occurred: ' + error.message);
    }
  })
  .finally(() => {
    // Hide loading indicator
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
      loadingOverlay.style.opacity = '0';
      loadingOverlay.style.pointerEvents = 'none';
      loadingOverlay.classList.remove('active');
    }
  });
}
