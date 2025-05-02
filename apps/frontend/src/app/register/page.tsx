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

const REGISTER_MUTATION = gql`
    mutation Register($name: String!, $email: String!, $password: String!) {
        registerUser(name: $name, email: $email, password: $password)
    }
`;

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const [register, { loading }] = useMutation(REGISTER_MUTATION);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data } = await register({
                variables: { name, email, password },
            });

            if (data.registerUser) {
                router.push('/login'); // Redirect to login page after successful registration
            } else {
                setError(data.register.message || 'Registration failed');
            }
        } catch (err) {
            setError('Registration failed: ' + err);
        }
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
                    Register
                </Typography>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ mt: 2, width: '100%' }}
                >
                    <TextField
                        label="Name"
                        type="text"
                        fullWidth
                        margin="normal"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
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
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 3 }}
                    >
                        Register
                    </Button>
                </Box>
                <Button
                    variant="text"
                    color="secondary"
                    disabled={loading}
                    onClick={() => router.push('/login')}
                    sx={{ mt: 2 }}
                >
                    Already have an account? Login
                </Button>
            </Box>
        </Container>
    );
};

export default RegisterPage;