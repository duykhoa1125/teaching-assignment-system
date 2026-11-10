package vn.edu.tass.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.tass.backend.entity.RequiredDemandComponent;

public interface RequiredDemandComponentRepository extends JpaRepository<RequiredDemandComponent, Long>, JpaSpecificationExecutor<RequiredDemandComponent> {
}
