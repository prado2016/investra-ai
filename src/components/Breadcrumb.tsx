import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ChevronRight, Home } from 'lucide-react';

const BreadcrumbContainer = styled.nav`
  background: #f8fafc;
  padding: 1rem 0;
  border-bottom: 1px solid #e5e7eb;
`;

const BreadcrumbContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;

  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const BreadcrumbList = styled.ol`
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0.5rem;
`;

const BreadcrumbItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BreadcrumbLink = styled(Link)`
  color: #6b7280;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s;

  &:hover {
    color: #4ade80;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }
`;

const BreadcrumbCurrent = styled.span`
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
`;

const BreadcrumbSeparator = styled(ChevronRight)`
  width: 1rem;
  height: 1rem;
  color: #9ca3af;
`;

interface BreadcrumbProps {
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ className }) => {
  const location = useLocation();
  
  // Define route mappings
  const routeNames: Record<string, string> = {
    '/': 'Dashboard',
    '/positions': 'Positions',
    '/transactions': 'Transactions',
    '/summary': 'Summary',
    '/daily-summary': 'Summary', // Legacy route mapping
    '/settings': 'Settings',
  };

  // Generate breadcrumb items
  const generateBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbs = [];

    // Always add home
    breadcrumbs.push({
      path: '/',
      name: 'Dashboard',
      isHome: true,
      isCurrent: location.pathname === '/'
    });

    // Add other path segments
    if (pathnames.length > 0 && location.pathname !== '/') {
      const currentPath = '/' + pathnames.join('/');
      breadcrumbs.push({
        path: currentPath,
        name: routeNames[currentPath] || 'Unknown',
        isHome: false,
        isCurrent: true
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs if we're on the home page only
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <BreadcrumbContainer className={className}>
      <BreadcrumbContent>
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <BreadcrumbItem key={breadcrumb.path}>
              {index > 0 && <BreadcrumbSeparator />}
              {breadcrumb.isCurrent ? (
                <BreadcrumbCurrent>
                  {breadcrumb.isHome && <Home />}
                  {breadcrumb.name}
                </BreadcrumbCurrent>
              ) : (
                <BreadcrumbLink to={breadcrumb.path}>
                  {breadcrumb.isHome && <Home />}
                  {breadcrumb.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </BreadcrumbContent>
    </BreadcrumbContainer>
  );
};

export default Breadcrumb;
