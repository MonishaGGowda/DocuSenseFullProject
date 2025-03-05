document.getElementById('login-btn').addEventListener('click', async function () {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (username && password) {
        try {
            const response = await fetch('/login_page/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                window.location.href = '/home_page/'; 
            } else {
                alert(data.message || 'Login failed.');
            }
        } catch (error) {
            alert('An error occurred while logging in.');
            console.error(error);
        }
    } else {
        alert('Please enter username and password.');
    }
});
document.getElementById('signup-btn').addEventListener('click', async function () {
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (username && email && password) {
        try {
            const response = await fetch('/signup_page/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken() 
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                alert('Signed up successfully!');
                window.location.href = '/home_page/'; 
            } else {
                alert(data.message || 'Sign up failed.');
            }
        } catch (error) {
            alert('An error occurred while signing up.');
            console.error(error);
        }
    } else {
        alert('Please fill all fields.');
    }
});

function getCSRFToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    return cookieValue || '';
}