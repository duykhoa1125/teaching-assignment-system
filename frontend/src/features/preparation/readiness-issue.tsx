import { Link } from 'react-router';
import { Icon } from '@/shared/ui/icon';
import { badgeStatusForIssue, resolveIssueTarget } from './model';
import type { ReadinessIssue as Issue } from './types';

export function ReadinessIssue({ issue }: { issue: Issue }) {
    const badge = badgeStatusForIssue(issue);
    const target = resolveIssueTarget(issue);
    return (
        <article className="mvp-check-result">
            <div>
                <code className="mvp-code">{issue.code}</code>
                <br />
                <span className={`mvp-status ${badge}`}>{badge}</span>
            </div>
            <div>
                <h3>{issue.message}</h3>
                <p>{issue.suggestion}</p>
            </div>
            <Link to={target.path} className="btn small">
                {target.label}
                <Icon name="arrow" />
            </Link>
        </article>
    );
}
