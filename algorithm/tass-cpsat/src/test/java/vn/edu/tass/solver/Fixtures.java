package vn.edu.tass.solver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import java.nio.file.Path;
import java.util.*;
import static vn.edu.tass.solver.Contract.*;

final class Fixtures {
    static ObjectNode tree() throws Exception {return (ObjectNode)Json.MAPPER.readTree(Path.of("fixtures/greedy-trap.json").toFile());}
    static Snapshot base() throws Exception {return read(tree());}
    static Snapshot read(JsonNode tree) throws Exception {return Json.MAPPER.treeToValue(tree,Snapshot.class);}
    static void set(ObjectNode tree,String pointer,Object value) {
        int slash=pointer.lastIndexOf('/');JsonNode parent=tree.at(pointer.substring(0,slash));String key=pointer.substring(slash+1);
        JsonNode node=Json.MAPPER.valueToTree(value);if(parent instanceof ObjectNode object)object.set(key,node);else ((ArrayNode)parent).set(Integer.parseInt(key),node);
    }
    static Map<String,String> assignments(Result result){Map<String,String> map=new LinkedHashMap<>();result.assignments().forEach(a->map.put(a.demandId(),a.teacherId()));return map;}
    static ObjectNode oneTeacher() throws Exception {ObjectNode tree=tree();((ArrayNode)tree.get("teachers")).remove(1);return tree;}
    static ObjectNode components() throws Exception {
        ObjectNode tree=oneTeacher();((ArrayNode)tree.get("scopes")).remove(1);
        set(tree,"/scopes/0/requiredTypes",List.of("STANDARD","SPECIALIZED_TOPIC"));
        set(tree,"/demands/1/subjectId","MATH");set(tree,"/demands/1/type","SPECIALIZED_TOPIC");return tree;
    }
}
