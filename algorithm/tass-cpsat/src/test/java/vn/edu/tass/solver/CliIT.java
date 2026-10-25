package vn.edu.tass.solver;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static vn.edu.tass.solver.Contract.*;

class CliIT {
    @TempDir Path temp;
    @Test void packagedJarRunsNativeSolverAndExportsReproducibleSnapshot() throws Exception {
        Path out=temp.resolve("result"),log=temp.resolve("cli.log");
        Process process=new ProcessBuilder(Path.of(System.getProperty("java.home"),"bin","java").toString(),"-jar","target/tass-cpsat-0.1.0.jar","fixtures/greedy-trap.json",out.toString()).redirectErrorStream(true).redirectOutput(log.toFile()).start();
        assertTrue(process.waitFor(40,TimeUnit.SECONDS));assertEquals(0,process.exitValue(),Files.readString(log));
        Result result=Json.MAPPER.readValue(out.resolve("result.json").toFile(),Result.class);Snapshot snapshot=Json.MAPPER.readValue(out.resolve("input-snapshot.json").toFile(),Snapshot.class);
        assertEquals("OPTIMAL",result.status());assertEquals(Json.hash(snapshot),result.snapshotHash());assertEquals(3,Files.readAllLines(out.resolve("assignments.csv")).size());assertEquals(3,Files.readAllLines(out.resolve("loads.csv")).size());
        Process repeat=new ProcessBuilder(Path.of(System.getProperty("java.home"),"bin","java").toString(),"-jar","target/tass-cpsat-0.1.0.jar","fixtures/greedy-trap.json",out.toString()).redirectErrorStream(true).redirectOutput(log.toFile()).start();
        assertTrue(repeat.waitFor(10,TimeUnit.SECONDS));assertEquals(73,repeat.exitValue());
    }
    @Test void unknownJsonFieldsAreRejected() throws Exception {
        var tree=Fixtures.tree();tree.put("guessedDatabaseColumn",true);assertThrows(Exception.class,()->Fixtures.read(tree));
    }
}
