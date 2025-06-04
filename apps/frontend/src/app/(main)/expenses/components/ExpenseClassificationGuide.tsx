'use client';

import { Box, Typography, Card, Chip } from '@mui/material';

const ExpenseClassificationGuide = () => {
    return (
        <Card sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Expense Classification Guide</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip 
                        label="Essential" 
                        color="primary" 
                        size="small" 
                        sx={{ borderRadius: 1 }}
                    />
                    <Typography variant="body2">
                        <strong>Essential expenses</strong> are needed for family well-being and quality of life, not just survival.
                        Examples include groceries, utilities, education, and family entertainment.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip 
                        label="Non-essential" 
                        size="small"
                        sx={{ borderRadius: 1, borderColor: 'warning.main', color: 'warning.main' }}
                        variant="outlined"
                    />
                    <Typography variant="body2">
                        <strong>Non-essential expenses</strong> are luxurious or premium expenses that can be avoided or replaced with cheaper alternatives.
                        Examples include expensive dining out, premium subscriptions, or luxury shopping.
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 1 }}>
                    You can now classify any expense as either essential or non-essential regardless of its category.
                </Typography>
            </Box>
        </Card>
    );
};

export default ExpenseClassificationGuide;
