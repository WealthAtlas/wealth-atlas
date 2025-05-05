'use client';

import { useLoginUserMutation } from '@/graphql/models/generated';
import {
    Alert,
    Box,
    Button,
    Container,
    TextField,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const [login, { loading, error: loginError }] = useLoginUserMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await login({
                variables: { email, password },
            });

            if (data?.loginUser) {
                router.push('/dashboard');
            } else {
                setError(loginError?.message || 'Login failed');
            }
        } catch (err) {
            setError('Login failed: ' + err);
        }
    };

    const handleRegisterRedirect = () => {
        router.push('/register');
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