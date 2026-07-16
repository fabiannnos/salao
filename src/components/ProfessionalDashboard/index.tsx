import { Comanda, Professional, Salon } from '../../types';
import ProfessionalDashboardDesktop from './ProfessionalDashboardDesktop';
import ProfessionalDashboardMobile from './ProfessionalDashboardMobile';

interface Props {
  professional: Professional;
  comandas: Comanda[];
  salon?: Salon | null;
  onLogout: () => void;
}

export default function ProfessionalDashboard(props: Props) {
  return (
    <>
      <div className="hidden md:block">
        <ProfessionalDashboardDesktop {...props} />
      </div>
      <div className="block md:hidden">
        <ProfessionalDashboardMobile {...props} />
      </div>
    </>
  );
}
