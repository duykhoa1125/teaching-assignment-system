package vn.edu.tass.solver;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;
import static vn.edu.tass.solver.Fixtures.*;
import static org.junit.jupiter.api.Assertions.*;

class ExhaustiveOracleTest {
    @Test void poc02ThirtySeededInstancesMatchIndependentEnumeration() throws Exception {
        AssignmentSolver solver=new AssignmentSolver();Random random=new Random(20261025);
        for(int sample=0;sample<30;sample++) {
            ObjectNode t=tree();ArrayNode demands=(ArrayNode)t.get("demands"),scopes=(ArrayNode)t.get("scopes");
            demands.add(demands.get(0).deepCopy());scopes.add(scopes.get(0).deepCopy());
            int[] hours=new int[3],caps=new int[2],fixed=new int[2];int[][] penalties=new int[2][3];
            for(int j=0;j<3;j++) {hours[j]=1+random.nextInt(3);set(t,"/demands/"+j+"/id","D"+j);set(t,"/demands/"+j+"/classId","CLASS"+j);set(t,"/demands/"+j+"/subjectId","MATH");set(t,"/demands/"+j+"/periods",hours[j]);set(t,"/scopes/"+j+"/classId","CLASS"+j);set(t,"/scopes/"+j+"/subjectId","MATH");}
            for(int i=0;i<2;i++) {
                fixed[i]=random.nextInt(2);caps[i]=fixed[i]+random.nextInt(6);Map<String,Integer> coefficients=new LinkedHashMap<>(),penaltyMap=new LinkedHashMap<>();
                for(int j=0;j<3;j++){coefficients.put("D"+j,hours[j]);penalties[i][j]=random.nextInt(4);penaltyMap.put("D"+j,penalties[i][j]);}
                set(t,"/teachers/"+i+"/workload/base",3);set(t,"/teachers/"+i+"/workload/fixedOutside",fixed[i]);set(t,"/teachers/"+i+"/hardChecks/0/fixed",fixed[i]);set(t,"/teachers/"+i+"/hardChecks/0/limit",caps[i]);set(t,"/teachers/"+i+"/hardChecks/0/coefficients",coefficients);set(t,"/teachers/"+i+"/experiencePenalties",penaltyMap);
            }
            set(t,"/config/loadWeight",2);set(t,"/config/experienceWeight",3);
            long[] best=null;
            // 0=unassigned, 1=teacher 0, 2=teacher 1. No CP-SAT/production validator used here.
            for(int code=0;code<27;code++) {
                int value=code,missing=0,exp=0;int[] load=fixed.clone();
                for(int j=0;j<3;j++){int choice=value%3;value/=3;if(choice==0)missing++;else{load[choice-1]+=hours[j];exp+=penalties[choice-1][j];}}
                if(load[0]>caps[0] || load[1]>caps[1])continue;
                long d0=Math.abs(load[0]-3),d1=Math.abs(load[1]-3);
                long[] vector={missing,100*(d0+d1),100*Math.max(d0,d1),exp,0};
                boolean smaller=best==null;
                if(best!=null)for(int k=0;k<5;k++){if(vector[k]!=best[k]){smaller=vector[k]<best[k];break;}}
                if(smaller)best=vector;
            }
            var result=solver.solve(read(t));assertEquals("OPTIMAL",result.status(),"sample="+sample+" "+result.errors());
            assertEquals(Arrays.stream(best).boxed().toList(),result.metrics().objectiveVector(),"sample="+sample);
        }
    }
}
