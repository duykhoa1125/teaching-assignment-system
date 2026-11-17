import { formatPreparationApiError } from '@/features/preparation/model';
import { RoleStateCard } from '@/features/session/role-ui';
import { usePreparationData } from './use-preparation-data';
import { usePreparationStep } from './use-preparation-step';
import { useScopeEditor } from './use-scope-editor';
import { useApplicabilityEditor } from './use-applicability-editor';
import { useRequiredComponentEditor } from './use-required-component-editor';
import { usePreparationDeletion } from './use-preparation-deletion';
import { PreparationSummary } from './preparation-summary';
import { ScopeStep } from './scope-step';
import { ApplicabilityStep } from './applicability-step';
import { RequiredComponentsStep } from './required-components-step';
import { ReadinessStep } from './readiness-step';
import { ScopeDialog } from './scope-dialog';
import { ApplicabilityDialog } from './applicability-dialog';
import { RequiredComponentDialog } from './required-component-dialog';
import { PreparationDeleteDialog } from './preparation-delete-dialog';

export function PreparationScreen() {
    const data = usePreparationData();
    const { step, setStep } = usePreparationStep();
    // Keep editors mounted across steps so switching tabs preserves filters/forms.
    const scopeEditor = useScopeEditor(data);
    const applicabilityEditor = useApplicabilityEditor(data);
    const componentEditor = useRequiredComponentEditor(data);
    const deletion = usePreparationDeletion();
    const { roundsQuery } = data;
    return (
        <div className="fe05-page">
            <PreparationSummary data={data} />
            <nav className="mvp-stepper" aria-label="Bốn bước chuẩn bị dữ liệu">
                {(
                    [
                        [1, 'Phạm vi'],
                        [2, 'Áp dụng'],
                        [3, 'Tập bắt buộc'],
                        [4, 'Sẵn sàng'],
                    ] as const
                ).map(([stepNo, label]) => (
                    <button
                        key={stepNo}
                        type="button"
                        className={step === stepNo ? 'active' : ''}
                        aria-current={step === stepNo ? 'step' : undefined}
                        onClick={() => setStep(stepNo)}
                    >
                        <b>0{stepNo}</b>
                        {label}
                    </button>
                ))}
            </nav>

            {roundsQuery.isError ? (
                <RoleStateCard
                    kind="error"
                    title="Không tải được đợt phân công"
                    detail={formatPreparationApiError(roundsQuery.error)}
                />
            ) : null}

            {step === 1 ? (
                <ScopeStep
                    data={data}
                    editor={scopeEditor}
                    deletion={deletion}
                />
            ) : null}
            {step === 2 ? (
                <ApplicabilityStep
                    data={data}
                    editor={applicabilityEditor}
                    deletion={deletion}
                />
            ) : null}
            {step === 3 ? (
                <RequiredComponentsStep
                    data={data}
                    editor={componentEditor}
                    deletion={deletion}
                    onConfirmComponents={
                        applicabilityEditor.handleConfirmComponentsForApp
                    }
                />
            ) : null}
            {step === 4 ? <ReadinessStep data={data} /> : null}
            <ScopeDialog data={data} editor={scopeEditor} />
            <ApplicabilityDialog data={data} editor={applicabilityEditor} />
            <RequiredComponentDialog data={data} editor={componentEditor} />
            <PreparationDeleteDialog deletion={deletion} />
        </div>
    );
}
