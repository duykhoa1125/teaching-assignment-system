import { useSearchParams } from 'react-router';
import {
    parsePreparationStep,
    preparationStepParams,
    type PreparationStep,
} from './round-navigation';

export function usePreparationStep() {
    const [searchParams, setSearchParams] = useSearchParams();
    const step = parsePreparationStep(searchParams.get('step'));
    const setStep = (next: PreparationStep) => {
        setSearchParams((current) => preparationStepParams(current, next));
    };
    return { step, setStep };
}
