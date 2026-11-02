import { ButtonLink } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

export function NotFoundPage() {
  return (
    <div className="page-stack">
      <Card className="not-found">
        <CardBody>
          <span className="not-found__mark" aria-hidden="true">
            <Icon name="sparkle" size={30} />
          </span>
          <p className="eyebrow">Page not found</p>
          <h1>This path has drifted off the map.</h1>
          <p>
            The link may be old, or the page may have moved. Your saved data is untouched. Head back
            to Today, or open the guide if you were looking for an explanation.
          </p>
          <div className="not-found__actions">
            <ButtonLink to="/" icon="home">
              Back to Today
            </ButtonLink>
            <ButtonLink to="/help" variant="secondary" icon="help">
              How Tide works
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
