package vn.edu.tass.backend.service;

import java.security.Principal;

/** Auth integration seam. Actor identity must originate from trusted server authentication. */
public interface PlanActorResolver {
    long requireActor(Principal principal);
}
