package com.interview.coach;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the AI Interview Coach Spring Boot application.
 *
 * @SpringBootApplication combines:
 *   - @Configuration       → marks this class as a source of bean definitions
 *   - @EnableAutoConfiguration → tells Spring Boot to configure beans based on classpath
 *   - @ComponentScan       → scans this package and sub-packages for @Component, @Service, etc.
 */
@SpringBootApplication
public class InterviewCoachApplication {

    public static void main(String[] args) {
        SpringApplication.run(InterviewCoachApplication.class, args);
    }
}
