package vn.edu.tass.solver;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static vn.edu.tass.solver.InputValidator.*;

/** Maps verified subject/grade years to a penalty; never derives years from drafts or sums class counts. */
public final class ExperienceScoring {
    private ExperienceScoring() {}
    public enum Status { HAS_EXPERIENCE, NO_EXPERIENCE, UNKNOWN }
    public record Band(BigDecimal minYears,long penalty) {}
    public record Policy(List<Band> bands,Long unknownPenalty,String source) {
        public Policy {bands=List.copyOf(bands);}
    }
    public record Evidence(Status status,BigDecimal years,LocalDate asOfDate,String source) {}
    public static long penalty(Evidence evidence,LocalDate calculationDate,Policy policy) {
        require(evidence!=null && evidence.status()!=null && calculationDate!=null && policy!=null,"experience","Missing evidence/configuration");
        text(policy.source(),"experience.policy.source");
        require(evidence.asOfDate()!=null && !evidence.asOfDate().isAfter(calculationDate),"experience.asOfDate","Experience is dated after the calculation date");
        require(!policy.bands().isEmpty(),"experience.bands","At least one band required");
        BigDecimal last=null;long lastPenalty=SAFE;
        for(Band band:policy.bands()) {
            require(band.minYears()!=null && band.minYears().signum()>=0 && (last==null?band.minYears().signum()==0:band.minYears().compareTo(last)>0),"experience.bands","Bands must start at zero and increase strictly");
            bounded(band.penalty(),"experience.penalty");require(band.penalty()<=lastPenalty,"experience.bands","Penalty must not increase with years");last=band.minYears();lastPenalty=band.penalty();
        }
        if(evidence.status()==Status.UNKNOWN) {
            require(evidence.years()==null,"experience.years","UNKNOWN must not be stored as zero");
            require(policy.unknownPenalty()!=null,"experience.unknown","INSUFFICIENT_DATA: policy blocks unknown experience");
            return bounded(policy.unknownPenalty(),"experience.unknownPenalty");
        }
        text(evidence.source(),"experience.evidence.source");
        require(evidence.years()!=null && (evidence.status()==Status.NO_EXPERIENCE?evidence.years().signum()==0:evidence.years().signum()>0),"experience.years","Inconsistent verified status/years");
        long result=policy.bands().get(0).penalty();
        for(Band band:policy.bands())if(evidence.years().compareTo(band.minYears())>=0)result=band.penalty();else break;
        return result;
    }
}
