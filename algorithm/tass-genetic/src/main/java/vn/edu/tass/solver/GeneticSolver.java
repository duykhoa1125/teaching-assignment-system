package vn.edu.tass.solver;

import static vn.edu.tass.solver.Contract.*;
import java.util.*;

/** Random-key order + teacher-preference chromosomes, feasible decoder, elitism and tournament selection. */
public final class GeneticSolver implements SolverAlgorithm {
    public record Options(int population,int generations,double mutationRate) {
        public Options {if(population<4 || population>1000 || generations<1 || generations>100000 || !Double.isFinite(mutationRate) || mutationRate<0 || mutationRate>1)throw new IllegalArgumentException("Invalid GA options");}
        public static Options defaults(){return new Options(40,200,0.10);}
    }
    private record Individual(double[] keys,int[] preference,HeuristicProblem.Candidate candidate) {}
    private final Options options;
    public GeneticSolver(){this(Options.defaults());}
    public GeneticSolver(Options options){this.options=Objects.requireNonNull(options);}
    public Options options(){return options;}
    public String name(){return "GENETIC";}
    public Result solve(Snapshot input,Cancellation cancel) {
        long start=System.nanoTime();
        try {
            HeuristicProblem problem=new HeuristicProblem(input);
            if(cancel.isCancelled())return HeuristicResults.failure(input,"CANCELLED",List.of(),name(),start);
            Random random=new Random(input.config().seed());long deadline=HeuristicResults.deadline(input,start);
            java.util.function.BooleanSupplier stop=()->cancel.isCancelled() || System.nanoTime()>=deadline;
            int n=problem.demandCount();int[] preference=new int[n];Arrays.fill(preference,-1);double[] keys=new double[n];
            int[] order=problem.greedyOrder();for(int k=0;k<n;k++)keys[order[k]]=(k+0.5)/Math.max(1,n);
            Individual seed=evaluate(problem,keys,preference,stop);List<Individual> population=new ArrayList<>();population.add(seed);Individual best=seed;
            Comparator<Individual> fitness=Comparator.comparing(v->v.candidate().score());
            for(int i=1;i<options.population() && !stop.getAsBoolean();i++) {
                double[] randomKeys=new double[n];int[] randomPreference=new int[n];
                for(int j=0;j<n;j++){randomKeys[j]=random.nextDouble();randomPreference[j]=randomPreference(problem,j,random);}
                Individual individual=evaluate(problem,randomKeys,randomPreference,stop);population.add(individual);if(fitness.compare(individual,best)<0)best=individual;
            }
            int generation=0;
            for(;generation<options.generations() && !stop.getAsBoolean();generation++) {
                population.sort(fitness);List<Individual> next=new ArrayList<>();next.add(population.get(0));if(population.size()>1)next.add(population.get(1));
                while(next.size()<options.population() && !stop.getAsBoolean()) {
                    Individual a=tournament(population,random,fitness),b=tournament(population,random,fitness);
                    double[] childKeys=new double[n];int[] childPreference=new int[n];
                    for(int j=0;j<n;j++) {
                        childKeys[j]=random.nextBoolean()?a.keys()[j]:b.keys()[j];childPreference[j]=random.nextBoolean()?a.preference()[j]:b.preference()[j];
                        if(random.nextDouble()<options.mutationRate())childKeys[j]=random.nextDouble();
                        if(random.nextDouble()<options.mutationRate())childPreference[j]=randomPreference(problem,j,random);
                    }
                    Individual child=evaluate(problem,childKeys,childPreference,stop);next.add(child);if(fitness.compare(child,best)<0)best=child;
                }
                population=next;
            }
            String reason=stop.getAsBoolean()?"TIME_LIMIT":"GENERATION_LIMIT";
            return HeuristicResults.success(input,problem,best.candidate(),name(),reason+"; generations="+generation+"; population="+options.population()+"; mutation="+options.mutationRate(),start,cancel);
        } catch(RuntimeException error){return HeuristicResults.error(input,error,name(),start);}
    }
    private static int randomPreference(HeuristicProblem problem,int j,Random random) {
        int[] candidates=problem.candidates(j);int choice=random.nextInt(candidates.length+2);return choice<2?choice-2:candidates[choice-2];
    }
    private static Individual tournament(List<Individual> population,Random random,Comparator<Individual> fitness) {
        Individual best=population.get(random.nextInt(population.size()));for(int k=1;k<3;k++){Individual other=population.get(random.nextInt(population.size()));if(fitness.compare(other,best)<0)best=other;}return best;
    }
    private static Individual evaluate(HeuristicProblem problem,double[] keys,int[] preference,java.util.function.BooleanSupplier stop) {
        Integer[] sorted=new Integer[keys.length];for(int j=0;j<sorted.length;j++)sorted[j]=j;
        Arrays.sort(sorted,Comparator.comparingDouble((Integer j)->keys[j]).thenComparingInt(j->j));
        return new Individual(keys,preference,problem.decode(Arrays.stream(sorted).mapToInt(Integer::intValue).toArray(),preference,stop));
    }
}
