'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Alert,
} from '@mui/material';
import { gql, useMutation } from '@apollo/client';

const LOGIN_MUTATION = gql`
    mutation Login($email: String!, $password: String!) {
        loginUser(email: $email, password: $password)
    }
`;

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const [login, { loading }] = useMutation(LOGIN_MUTATION);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await login({
                variables: { email, password },
            });

            if (data.loginUser) {
                router.push('/dashboard');
            } else {
                setError(data.register.message || 'Registration failed');
            }
        } catch (err) {
            setError('Login failed: ' + err);
        }
    };

    const handleRegisterRedirect = () => {
        router.push('/register'); // Redirect to the registration page
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    mt: 8,
                }}
            >
                <Typography variant="h4" component="h1" gutterBottom>
                    Login
                </Typography>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ mt: 2, width: '100%' }}
                >
                    <TextField
                        label="Email"
                        type="email"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <TextField
                        label="Password"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Button
                        type="submit"
                        disabled={loading}
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 3 }}
                    >
                        Login
                    </Button>
                </Box>
                <Button
                    variant="text"
                    color="secondary"
                    onClick={handleRegisterRedirect}
                    sx={{ mt: 2 }}
                >
                    Don&apos;t have an account? Register
                </Button>
            </Box>
        </Container>
    );
};

export default LoginPage;