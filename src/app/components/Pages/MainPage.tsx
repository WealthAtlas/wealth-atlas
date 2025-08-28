import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AssetsContainer } from '../../containers/assets/AssetsContainer';
import { DashboardContainer } from '../../containers/dashboard/DashboardContainer';
import { ExpensesContainer } from '../../containers/expense/ExpensesContainer';
import { GoalsContainer } from '../../containers/goal/GoalsContainer';
import { LoansContainer } from '../../containers/loan/LoansContainer';
import { MainLayout } from '../layouts/MainLayout';

export function MainPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current tab based on route
  const getCurrentTab = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 0;
      case '/assets':
        return 1;
      case '/loans':
        return 2;
      case '/expenses':
        return 3;
      case '/goals':
        return 4;
      default:
        return 0;
    }
  };

  const [currentTab, setCurrentTab] = useState(getCurrentTab());
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Keep tab selection in sync with the URL when navigation happens elsewhere
  useEffect(() => {
    setCurrentTab(getCurrentTab());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleTabChange = (newValue: number) => {
    setCurrentTab(newValue);

    // Navigate to corresponding route
    switch (newValue) {
      case 0:
        navigate('/dashboard');
        break;
      case 1:
        navigate('/assets');
        break;
      case 2:
        navigate('/loans');
        break;
      case 3:
        navigate('/expenses');
        break;
      case 4:
        navigate('/goals');
        break;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSettingsClick = () => {
    handleMenuClose();
    navigate('/settings');
  };

  // Render appropriate page content based on current tab
  const renderPageContent = () => {
    switch (currentTab) {
      case 0:
        return <DashboardContainer />;
      case 1:
        return <AssetsContainer />;
      case 2:
        return <LoansContainer />;
      case 3:
        return <ExpensesContainer />;
      case 4:
        return <GoalsContainer />;
      default:
        return <DashboardContainer />;
    }
  };

  return (
    <MainLayout
      currentTab={currentTab}
      onTabChange={handleTabChange}
      anchorEl={anchorEl}
      onMenuOpen={handleMenuOpen}
      onMenuClose={handleMenuClose}
      onSettingsClick={handleSettingsClick}
    >
      {renderPageContent()}
    </MainLayout>
  );
}
