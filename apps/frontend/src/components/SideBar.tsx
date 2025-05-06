'use client';

import { useLogoutUserMutation } from '@/graphql/models/generated';
import { ChevronLeft, Dashboard, Money, Settings } from '@mui/icons-material';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FC, JSX, useState } from 'react';


const drawerWidth = 240;

interface NavItem {
    label: string;
    href: string;
    icon: JSX.Element;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <Dashboard /> },
    { label: 'Assets', href: '/assets', icon: <Money /> },
];

const NavItem: FC<{ item: NavItem; isCollapsed: boolean }> = ({ item, isCollapsed }) => (
    <Link href={item.href} passHref legacyBehavior>
        <ListItemButton component="a">
            <ListItemIcon>{item.icon}</ListItemIcon>
            {!isCollapsed && <ListItemText primary={item.label} />}
        </ListItemButton>
    </Link>
);

const Sidebar: FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const router = useRouter();
    const [logout] = useLogoutUserMutation();

    const handleLogout = () => {
        logout()
            .then(() => {
                router.push('/login');
            });
    };

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: isCollapsed ? 60 : drawerWidth,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                [`& .MuiDrawer-paper`]: {
                    width: isCollapsed ? 60 : drawerWidth,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            {/* Top Section */}
            <Box>
                <List>
                    {/* Collapse Button */}
                    <ListItemButton onClick={() => setIsCollapsed(!isCollapsed)}>
                        <ListItemIcon>
                            <ChevronLeft />
                        </ListItemIcon>
                        {!isCollapsed && <ListItemText primary="" />}
                    </ListItemButton>

                    {/* Navigation Items */}
                    {navItems.map((item) => (
                        <NavItem key={item.href} item={item} isCollapsed={isCollapsed} />
                    ))}
                </List>
            </Box>

            {/* Bottom Section */}
            <Box>
                <ListItemButton onClick={handleLogout} sx={{ marginTop: 'auto' }}>
                    <ListItemIcon>
                        <Settings />
                    </ListItemIcon>
                    {!isCollapsed && <ListItemText primary="Logout" />}
                </ListItemButton>
            </Box>
        </Drawer>
    );
};

export default Sidebar;