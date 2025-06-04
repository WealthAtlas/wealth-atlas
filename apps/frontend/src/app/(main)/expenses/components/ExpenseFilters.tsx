'use client';

import {
    Box,
    TextField,
    InputAdornment,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Chip,
    Card,
    Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DateRangeIcon from '@mui/icons-material/DateRange';

interface TimeRangeOption {
    value: string;
    label: string;
}

interface ExpenseFiltersProps {
    timeRange: string;
    setTimeRange: (value: string) => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    categoryFilter: string[];
    setCategoryFilter: (value: string[]) => void;
    tagFilter: string[];
    setTagFilter: (value: string[]) => void;
    toggleCategoryFilter: (category: string) => void;
    toggleTagFilter: (tag: string) => void;
    categories: string[];
    tags: string[];
    timeRangeOptions?: TimeRangeOption[];
    getTimeRangeOptions?: () => TimeRangeOption[];
}

const ExpenseFilters = ({ 
    timeRange,
    setTimeRange,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    tagFilter,
    setTagFilter,
    toggleCategoryFilter,
    toggleTagFilter,
    categories,
    tags,
    timeRangeOptions = [],
    getTimeRangeOptions
}: ExpenseFiltersProps) => {
    // Use provided timeRangeOptions or get them from the function
    const options = timeRangeOptions.length > 0 ? timeRangeOptions : (getTimeRangeOptions ? getTimeRangeOptions() : []);
    
    return (
        <Card sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid>
                    <TextField
                        fullWidth
                        placeholder="Search expenses"
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Grid>
                
                <Grid>
                    <FormControl fullWidth>
                        <InputLabel>Time Range</InputLabel>
                        <Select
                            value={timeRange}
                            label="Time Range"
                            onChange={(e) => setTimeRange(e.target.value as string)}
                            startAdornment={
                                <InputAdornment position="start">
                                    <DateRangeIcon />
                                </InputAdornment>
                            }
                        >
                            {options.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                
                <Grid>
                    <FormControl fullWidth>
                        <InputLabel>Filter by Category</InputLabel>
                        <Select
                            multiple
                            value={categoryFilter}
                            label="Filter by Category"
                            onChange={(e) => setCategoryFilter(e.target.value as string[])}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={value} />
                                    ))}
                                </Box>
                            )}
                            startAdornment={
                                <InputAdornment position="start">
                                    <FilterListIcon />
                                </InputAdornment>
                            }
                        >
                            {categories.map((category) => (
                                <MenuItem key={category} value={category}>
                                    {category}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                
                <Grid>
                    <FormControl fullWidth>
                        <InputLabel>Filter by Classification</InputLabel>
                        <Select
                            multiple
                            value={tagFilter}
                            label="Filter by Classification"
                            onChange={(e) => setTagFilter(e.target.value as string[])}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip 
                                            key={value} 
                                            label={value} 
                                            color={value === 'Essential' ? 'primary' : 'default'}
                                            variant={value === 'Non-essential' ? 'outlined' : 'filled'}
                                            sx={value === 'Non-essential' ? { 
                                                borderColor: 'warning.main', 
                                                color: 'warning.main' 
                                            } : {}}
                                        />
                                    ))}
                                </Box>
                            )}
                        >
                            {tags.map((tag) => (
                                <MenuItem key={tag} value={tag}>
                                    {tag}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            
            {/* Active filters display */}
            {(categoryFilter.length > 0 || tagFilter.length > 0) && (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {categoryFilter.map(category => (
                        <Chip 
                            key={category}
                            label={category}
                            onDelete={() => toggleCategoryFilter(category)}
                            color="primary"
                            variant="outlined"
                        />
                    ))}
                    {tagFilter.map(tag => (
                        <Chip 
                            key={tag}
                            label={tag}
                            onDelete={() => toggleTagFilter(tag)}
                            color="secondary"
                            variant="outlined"
                        />
                    ))}
                </Box>
            )}
        </Card>
    );
};

export default ExpenseFilters;
